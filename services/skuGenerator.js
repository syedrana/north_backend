const ProductVariant = require("../models/productVariant");

function clean(str, len = 4) {
  return str
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, len);
}

async function generateSKU({ productName, color, size }) {
  const base =
    clean(productName, 5) +
    "-" +
    clean(color, 3) +
    "-" +
    clean(size.toString(), 4);

  for (let i = 0; i < 5; i++) {
    const rand = Math.floor(100 + Math.random() * 900);
    const sku = `${base}-${rand}`;

    const exists = await ProductVariant.exists({ sku });
    if (!exists) return sku;
  }

  throw new Error("SKU generation failed after retries");
}

module.exports = generateSKU;
