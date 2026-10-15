const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8"
);

describe("Online Bookstore application", () => {
    test("contains at least six book records", () => {
        const matches = html.match(/\bid:\s*\d+,\s*\n\s*title:/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(6);
    });

    test("includes title and author search", () => {
        expect(html).toContain('id="search"');
        expect(html).toContain("book.title.toLowerCase()");
        expect(html).toContain("book.author.toLowerCase()");
    });

    test("includes category filtering", () => {
        expect(html).toContain('id="category"');
        expect(html).toContain("matchesCategory");
    });

    test("includes shopping cart and total", () => {
        expect(html).toContain('id="cart"');
        expect(html).toContain('id="total"');
        expect(html).toContain("function addToCart");
    });

    test("includes order creation and tracking", () => {
        expect(html).toContain("function placeOrder");
        expect(html).toContain("function renderOrders");
        expect(html).toContain("Confirmed");
    });

    test("includes stock validation", () => {
        expect(html).toContain("Out of Stock");
        expect(html).toContain("book.stock < item.quantity");
    });

    test("includes the rating summary feature", () => {
        expect(html).toContain("Book Rating Summary");
        expect(html).toContain("4.7/5");
    });
});