const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").end(JSON.stringify(body));
}

function loadProducts() {
  const file = path.join(process.cwd(), "backend.json");
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const data = JSON.parse(raw);
  return Array.isArray(data.products) ? data.products : [];
}

module.exports = function orderHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const requestedItems = Array.isArray(body && body.items) ? body.items : [];
    if (requestedItems.length === 0 || requestedItems.length > 50) {
      return sendJson(res, 400, { error: "Invalid order items" });
    }

    const products = loadProducts();
    const items = requestedItems.map(item => {
      const product = products.find(candidate =>
        candidate.title === item.title && candidate.platform === item.platform
      );
      const quantity = Number(item.qty);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new Error("Invalid product or quantity");
      }
      return {
        title: product.title,
        platform: product.platform,
        price: Number(product.price),
        qty: quantity,
        subtotal: Number(product.price) * quantity
      };
    });

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const orderId = `LP-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    return sendJson(res, 200, { orderId, currency: "ARS", total, status: "awaiting_payment", items });
  } catch (error) {
    return sendJson(res, 400, { error: "Could not validate order" });
  }
};
