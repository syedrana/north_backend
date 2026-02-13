const DeliverySetting = require("../../models/DeliverySetting");

const getDeliverySetting = async (req, res) => {
  try {
    const setting = await DeliverySetting.findOne({ isActive: true });
    res.json(setting);
  } catch (e) {
    res.status(500).json({ message: "Failed to load setting" });
  }
};

function validateCodSlabs(slabs) {
  if (!slabs || !slabs.length) return false;

  slabs.sort((a, b) => a.min - b.min);

  for (let i = 0; i < slabs.length; i++) {
    if (slabs[i].min > slabs[i].max) return false;

    if (i > 0 && slabs[i].min <= slabs[i - 1].max) {
      return false; // overlap
    }
  }

  return true;
}


const createOrUpdate = async (req, res) => {
  try {
    const { insideCityFee, outsideCityFee, freeAbove, insideCityName, bulkyInsideFee, bulkyOutsideFee, weightSlabs, codSlabs } = req.body;

    if (!validateCodSlabs(codSlabs)) {
      return res.status(400).json({
        message: "Invalid COD slabs configuration",
      });
    }

    await DeliverySetting.updateMany({}, { isActive: false });

    const setting = await DeliverySetting.create({
      insideCityFee: insideCityFee,
      outsideCityFee: outsideCityFee,
      freeAbove: freeAbove,
      insideCityName: insideCityName,
      bulkyInsideFee: bulkyInsideFee,
      bulkyOutsideFee: bulkyOutsideFee,
      weightSlabs: weightSlabs || [],
      codFeeType: "slab",
      codSlabs: codSlabs,
      isActive: true,
    });

    res.json(setting);

  } catch (e) {
    console.error("DELIVERY SAVE ERROR:", e);
    res.status(500).json({ message: e.message });
  }
};


module.exports = {getDeliverySetting, createOrUpdate };
