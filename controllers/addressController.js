const Address = require("../models/address");

// ➕ Create Address
exports.createAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (req.body.isDefault) {
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.create({
      ...req.body,
      userId,
    });

    res.status(201).json({ success: true, address });
  } catch (err) {
    next(err);
  }
};

// 📦 Get All Addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({
      userId: req.user._id,
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, addresses });
  } catch (err) {
    next(err);
  }
};

// ⭐ Set Default Address
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    await Address.updateMany(
      { userId },
      { $set: { isDefault: false } }
    );

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({ success: true, address });
  } catch (err) {
    next(err);
  }
};

// ✏️ Update Address
exports.updateAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    if (req.body.isDefault) {
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({ success: true, address });
  } catch (err) {
    next(err);
  }
};
