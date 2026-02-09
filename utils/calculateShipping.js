// const DeliverySetting = require("../models/DeliverySetting");

// module.exports = async function calculateShipping({
//   subtotal,
//   address,
//   paymentMethod = "COD",
// }) {
//   const setting = await DeliverySetting.findOne({ isActive: true });

//   if (!setting) return 0;

//   if (subtotal >= setting.freeAbove) return 0;

//   let shipping =
//     address?.city === setting.insideCityName
//       ? setting.insideCityFee
//       : setting.outsideCityFee;

//   if (paymentMethod === "COD") {
//     shipping += setting.codExtraFee;
//   }

//   return shipping;
// };






// const DeliverySetting = require("../models/DeliverySetting");

// module.exports = async function calculateShipping({
//   items,
//   subtotal,
//   address,
//   paymentMethod = "COD",
// }) {
//   const setting = await DeliverySetting.findOne({ isActive: true });

//   if (!setting) return { total: 0, breakdown: {} };

//   // ✅ free delivery check
//   if (subtotal >= setting.freeAbove) {
//     return {
//       total: 0,
//       breakdown: {
//         base: 0,
//         weightExtra: 0,
//         itemExtra: 0,
//         codExtra: 0,
//         free: true,
//       },
//     };
//   }

//   const inside = address?.city === setting.insideCityName;

//   let base = inside
//     ? setting.insideCityFee
//     : setting.outsideCityFee;

//   // ✅ total weight
//   let totalWeight = 0;
//   let itemExtra = 0;

//   for (const item of items) {
//     const v = item.variantSnapshot;

//     const weight = v?.shipping?.weightGram || 300;
//     const extra = v?.shipping?.extraShippingFee || 0;

//     totalWeight += weight * item.quantity;
//     itemExtra += extra * item.quantity;
//   }

//   // ✅ slab extra
//   let slabExtra = 0;

//   const slab = setting.weightSlabs
//     .sort((a, b) => a.uptoGram - b.uptoGram)
//     .find(s => totalWeight <= s.uptoGram);

//   if (slab) {
//     slabExtra = inside ? slab.insideExtra : slab.outsideExtra;
//   }

//   // ✅ COD extra
//   let codExtra = paymentMethod === "COD"
//     ? setting.codExtraFee
//     : 0;

//   const total = base + slabExtra + itemExtra + codExtra;

//   return {
//     total,
//     breakdown: {
//       base,
//       weightExtra: slabExtra,
//       itemExtra,
//       codExtra,
//       totalWeight,
//     },
//   };
// };








const DeliverySetting = require("../models/DeliverySetting");

module.exports = async function calculateShipping({
  items = [],
  subtotal = 0,
  address = {},
  paymentMethod = "COD",
}) {
  const setting = await DeliverySetting.findOne({ isActive: true }).lean();

  if (!setting) {
    return { total: 0, breakdown: { reason: "no-setting" } };
  }

  // =========================
  // ✅ Normalize numbers
  // =========================
  const insideCityFee = Math.max(0, Number(setting.insideCityFee) || 0);
  const outsideCityFee = Math.max(0, Number(setting.outsideCityFee) || 0);
  const freeAbove = Math.max(0, Number(setting.freeAbove) || 0);
  const codExtraFee = Math.max(0, Number(setting.codExtraFee) || 0);

  // =========================
  // ✅ Free delivery
  // =========================
  if (freeAbove > 0 && subtotal >= freeAbove) {
    return {
      total: 0,
      breakdown: {
        base: 0,
        weightExtra: 0,
        itemExtra: 0,
        codExtra: 0,
        free: true,
      },
    };
  }

  // =========================
  // ✅ City match safe compare
  // =========================
  const city = (address.city || "").toLowerCase().trim();
  const insideCityName = (setting.insideCityName || "")
    .toLowerCase()
    .trim();

  const inside = city && city === insideCityName;

  // =========================
  // ✅ Base fee
  // =========================
  const base = inside ? insideCityFee : outsideCityFee;

  // =========================
  // ✅ Weight + per-item extra
  // =========================
  let totalWeight = 0;
  let itemExtra = 0;

  for (const item of items) {
    const v = item.variantSnapshot || {};

    const weight = Math.max(
      0,
      Number(v?.shipping?.weightGram) || 300
    );

    const extra = Math.max(
      0,
      Number(v?.shipping?.extraShippingFee) || 0
    );

    const qty = Math.max(1, Number(item.quantity) || 1);

    totalWeight += weight * qty;
    itemExtra += extra * qty;
  }

  // =========================
  // ✅ Slab calculation safe
  // =========================
  let slabExtra = 0;

  const slabs = Array.isArray(setting.weightSlabs)
    ? [...setting.weightSlabs].sort(
        (a, b) => a.uptoGram - b.uptoGram
      )
    : [];

  if (slabs.length > 0) {
    let slab =
      slabs.find(s => totalWeight <= s.uptoGram) ||
      slabs[slabs.length - 1]; // fallback last slab

    slabExtra = inside
      ? Math.max(0, Number(slab.insideExtra) || 0)
      : Math.max(0, Number(slab.outsideExtra) || 0);
  }

  // =========================
  // ✅ COD extra safe
  // =========================
  const codExtra =
    (paymentMethod || "").toUpperCase() === "COD"
      ? codExtraFee
      : 0;

  // =========================
  // ✅ Final total
  // =========================
  const total = base + slabExtra + itemExtra + codExtra;

  return {
    total,
    breakdown: {
      base,
      weightExtra: slabExtra,
      itemExtra,
      codExtra,
      totalWeight,
      insideCity: inside,
    },
  };
};
