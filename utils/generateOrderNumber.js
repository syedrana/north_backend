const Counter = require("../models/counter");

async function generateOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { key: "orderNumber" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  return `NR-${dateStr}-${String(counter.value).padStart(5, "0")}`;
}

module.exports = generateOrderNumber;
