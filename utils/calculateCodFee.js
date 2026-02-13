const DeliverySetting = require("../models/DeliverySetting");

async function calculateCodFee(subtotal) {
  const setting = await DeliverySetting.findOne();

  if (!setting || setting.codFeeType !== "slab") return 0;

  const slab = setting.codSlabs.find(
    (s) => subtotal >= s.min && subtotal <= s.max
  );

  return slab ? slab.fee : 0;
}

module.exports = calculateCodFee;
