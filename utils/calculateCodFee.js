const DeliverySetting = require("../models/DeliverySetting");

// async function calculateCodFee(subtotal) {
//   const setting = await DeliverySetting.findOne();
  
//   if (!setting) return 0;

//   const amount = Number(subtotal);

//   // 🔹 Slab based
//   if (setting.codFeeType === "slab" && setting.codSlabs.length > 0) {
//     const slab = setting.codSlabs.find(
//       (s) => amount >= s.min && amount <= s.max
//     );

//     return slab ? slab.fee : 0;
//   }
// }

async function calculateCodFee(subtotal) {
  const setting = await DeliverySetting.findOne({ isActive: true });

  if (!setting) return 0;

  // Slab system
  if (setting.codFeeType === "slab" && setting.codSlabs?.length > 0) {
    const slab = setting.codSlabs.find(
      (s) => subtotal >= s.min && subtotal <= s.max
    );
    return slab ? slab.fee : 0;
  }

  // Flat extra system
  // if (setting.codFeeType === "flat") {
  //   return setting.codExtraFee || 0;
  // }

  return 0;
}


module.exports = calculateCodFee;
