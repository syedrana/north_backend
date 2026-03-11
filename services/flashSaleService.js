const FlashSale = require("../models/flashSale");

const getActiveFlashSale = async (now = new Date()) => {
  const activeSale = await FlashSale.findOne({
    startTime: { $lte: now },
    endTime: { $gte: now },
    status: "active",
  })
    .populate("products")
    .lean();

  return activeSale;
};

module.exports = {
  getActiveFlashSale,
};
