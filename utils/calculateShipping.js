const DeliverySetting = require("../models/DeliverySetting");

module.exports = async function calculateShipping({
  items = [],
  subtotal = 0,
  address = {},
}) {

  const setting = await DeliverySetting
    .findOne({ isActive: true })
    .lean();

  if (!setting) {
    return { total: 0, breakdown: { reason: "no-setting" } };
  }

  if (!address?.district) {
    return { total: 0, breakdown: { reason: "no-address" } };
  }

  /* ---------- inside/outside ---------- */

  const district = address.district.toLowerCase().trim();
  const insideName = (setting.insideCityName || "")
    .toLowerCase()
    .trim();

  const inside = district === insideName;

  const base = inside
    ? Number(setting.insideCityFee) || 0
    : Number(setting.outsideCityFee) || 0;

  const freeAbove = Number(setting.freeAbove) || 0;

  if (freeAbove > 0 && subtotal >= freeAbove) {
    return {
      total: 0,
      breakdown: { free: true }
    };
  }

  /* ---------- item loop ---------- */

  let totalWeight = 0;
  let itemExtra = 0;
  let bulkyExtra = 0;

  for (const item of items) {
    if (!item.variantSnapshot) {
      throw new Error("variantSnapshot missing");
    }

    const v = item.variantSnapshot;
    const qty = Number(item.quantity) || 1;

    const w = Number(v?.shipping?.weightGram) || 300;
    const extra = Number(v?.shipping?.extraShippingFee) || 0;
    const bulky = Boolean(v?.shipping?.bulky);

    totalWeight += w * qty;
    itemExtra += extra * qty;

    if (bulky) {
      bulkyExtra += inside
        ? setting.bulkyInsideFee * qty
        : setting.bulkyOutsideFee * qty;
    }

  }

  /* ---------- slab incremental ---------- */

  let slabExtra = 0;

  const slabs = (setting.weightSlabs || [])
    .sort((a,b)=> a.uptoGram - b.uptoGram);

  if (slabs.length) {

    let prevExtra = 0;

    for (const slab of slabs) {
      if (totalWeight <= slab.uptoGram) {
        const cur = inside
          ? slab.insideExtra
          : slab.outsideExtra;

        slabExtra = Math.max(0, cur - prevExtra);
        break;
      }

      prevExtra = inside
        ? slab.insideExtra
        : slab.outsideExtra;
    }

    /* overflow beyond last slab */

    const last = slabs[slabs.length - 1];

    if (totalWeight > last.uptoGram) {
      const unit = last.uptoGram;
      const mult = Math.ceil(totalWeight / unit);

      const unitExtra = inside
        ? last.insideExtra
        : last.outsideExtra;

      slabExtra = unitExtra * mult;
    }
  }

  /* ---------- final ---------- */

  const total =
    base +
    slabExtra +
    itemExtra +
    bulkyExtra;

  return {
    total,
    breakdown: {
      base,
      slabExtra,
      itemExtra,
      bulkyExtra,
      totalWeight,
      inside,
      subtotal
    }
  };
};
