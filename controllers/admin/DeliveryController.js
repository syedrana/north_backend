const DeliverySetting = require("../../models/DeliverySetting");

const getDeliverySetting = async (req, res) => {
  try {
    const setting = await DeliverySetting.findOne({ isActive: true });
    res.json(setting);
  } catch (e) {
    res.status(500).json({ message: "Failed to load setting" });
  }
};

const createOrUpdate = async (req, res) => {
  try {
    const { insideCityFee, outsideCityFee, freeAbove, codExtraFee, insideCityName, weightSlabs } = req.body;

    await DeliverySetting.updateMany({}, { isActive: false });

    const setting = await DeliverySetting.create({
      insideCityFee: insideCityFee,
      outsideCityFee: outsideCityFee,
      freeAbove: freeAbove,
      codExtraFee: codExtraFee,
      insideCityName: insideCityName,
      isActive: true,
      weightSlabs: weightSlabs || [],
    });

    res.json(setting);

  } catch (e) {
    console.error("DELIVERY SAVE ERROR:", e);
    res.status(500).json({ message: e.message });
  }
};


module.exports = {getDeliverySetting, createOrUpdate };
