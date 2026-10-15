pipeline {
    agent any

    environment {
        IMAGE_NAME = 'gagana6969/online-bookstore'
        DEPLOYMENT_NAME = 'online-bookstore'
        SERVICE_NAME = 'online-bookstore-service'
        NAMESPACE = 'default'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Source code already checked out by Jenkins.'
            }
        }

        stage('Verify Files') {
            steps {
                powershell '''
                    $files = @(
                        "index.html",
                        "Dockerfile",
                        "deployment.yaml",
                        "package.json",
                        "tests/bookstore.test.js"
                    )

                    foreach ($file in $files) {
                        if (!(Test-Path $file)) {
                            throw "Missing required file: $file"
                        }

                        Write-Host "Verified: $file"
                    }
                '''
            }
        }

        stage('Automated Tests') {
            steps {
                powershell '''
                    npm ci

                    if ($LASTEXITCODE -ne 0) {
                        throw "npm ci failed."
                    }

                    npm test

                    if ($LASTEXITCODE -ne 0) {
                        throw "Automated tests failed. Deployment blocked."
                    }
                '''
            }
        }

        stage('Docker Build') {
            steps {
                powershell '''
                    docker build -t "${env:IMAGE_NAME}:v1" .

                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker build failed."
                    }
                '''
            }
        }

        stage('Security Scan Gate') {
            steps {
                powershell '''
                    trivy image `
                        --severity HIGH,CRITICAL `
                        --exit-code 1 `
                        "${env:IMAGE_NAME}:v1"

                    if ($LASTEXITCODE -ne 0) {
                        throw "Security gate failed. Image not approved for deployment."
                    }
                '''
            }
        }

        stage('Local Container Test') {
            steps {
                powershell '''
                    $existing = docker ps -aq --filter "name=bookstore-ci-test"

                    if ($existing) {
                        docker rm -f bookstore-ci-test
                    }

                    docker run -d `
                        --name bookstore-ci-test `
                        -p 18085:80 `
                        "${env:IMAGE_NAME}:v1"

                    if ($LASTEXITCODE -ne 0) {
                        throw "Container failed to start."
                    }

                    try {
                        $success = $false

                        for ($i = 0; $i -lt 10; $i++) {
                            try {
                                $response = Invoke-WebRequest `
                                    -Uri "http://localhost:18085" `
                                    -UseBasicParsing `
                                    -TimeoutSec 3

                                if ($response.StatusCode -eq 200) {
                                    $success = $true
                                    break
                                }
                            } catch {
                                Start-Sleep -Seconds 2
                            }
                        }

                        if (!$success) {
                            docker logs bookstore-ci-test
                            throw "Local HTTP health test failed."
                        }

                        Write-Host "Local application test passed."
                    }
                    finally {
                        docker rm -f bookstore-ci-test
                    }
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DH_USER',
                        passwordVariable: 'DH_TOKEN'
                    )
                ]) {
                    powershell '''
                        $env:DH_TOKEN | docker login `
                            --username $env:DH_USER `
                            --password-stdin

                        if ($LASTEXITCODE -ne 0) {
                            throw "Docker Hub authentication failed."
                        }

                        docker push "${env:IMAGE_NAME}:v1"

                        if ($LASTEXITCODE -ne 0) {
                            throw "Docker Hub push failed."
                        }
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'kuberconfig',
                        variable: 'KUBECONFIG_FILE'
                    )
                ]) {
                    powershell '''
                        $env:KUBECONFIG = $env:KUBECONFIG_FILE

                        kubectl apply -f deployment.yaml

                        if ($LASTEXITCODE -ne 0) {
                            throw "Kubernetes apply failed."
                        }

                        kubectl rollout status `
                            "deployment/${env:DEPLOYMENT_NAME}" `
                            -n $env:NAMESPACE `
                            --timeout=180s

                        if ($LASTEXITCODE -ne 0) {
                            throw "Kubernetes rollout failed."
                        }
                    '''
                }
            }
        }

        stage('Verify Deployment Gate') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'kuberconfig',
                        variable: 'KUBECONFIG_FILE'
                    )
                ]) {
                    powershell '''
                        $env:KUBECONFIG = $env:KUBECONFIG_FILE

                        $ready = kubectl get deployment `
                            $env:DEPLOYMENT_NAME `
                            -n $env:NAMESPACE `
                            -o jsonpath="{.status.readyReplicas}"

                        if ($LASTEXITCODE -ne 0 -or "$ready" -ne "3") {
                            throw "Deployment gate failed: expected 3 ready replicas; found $ready."
                        }

                        kubectl get deployment $env:DEPLOYMENT_NAME
                        kubectl get pods -l app=online-bookstore
                        kubectl get service $env:SERVICE_NAME

                        Write-Host "Deployment gate passed: all 3 replicas are ready."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Automated tests, security gate and Kubernetes deployment passed.'
        }

        failure {
            echo 'FAILURE: A required gate failed. Review the first failed stage.'
        }

        always {
            echo 'Online Bookstore CI/CD pipeline finished.'
        }
    }
}