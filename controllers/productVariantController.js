const mongoose = require("mongoose");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const generateSKU = require("../services/skuGenerator");
const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");
const cloudinary = require("../config/cloudinary");



/* ======================================================
   CREATE VARIANT (transaction safe)
====================================================== */

const createProductVariant = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const product = await Product.findById(req.params.productId).session(session);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* ===== FIXED: use LET ===== */

    let {
      size,
      color,
      price,
      discountPrice,
      stock,
      isDefault,
      shipping,
      lowStockThreshold,
      reservedStock,
    } = req.body;

    if (!size || !color || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "size, color, price, stock are required",
      });
    }

    /* ===== normalize ===== */

    size = size.toString().trim().toUpperCase();
    color = color.toString().trim().toLowerCase();
    price = Number(price);
    stock = Number(stock);
    discountPrice = discountPrice ? Number(discountPrice) : null;
    reservedStock = reservedStock !== undefined ? Number(reservedStock) : 0;
    lowStockThreshold = lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5;

    if (discountPrice && discountPrice >= price) {
      return res.status(400).json({
        success: false,
        message: "Discount price must be less than regular price",
      });
    }

    if (reservedStock > stock) {
      return res.status(400).json({
        success: false,
        message: "Reserved stock cannot exceed total stock",
      });
    }

    /* ===== image validation ===== */

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 images allowed",
      });
    }

    /* ===== SKU ===== */

    const sku = await generateSKU({
      productName: product.name,
      color,
      size,
    });

    /* ===== upload images ===== */

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer);
      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    /* ===== shipping parse (multipart safe) ===== */

    shipping = shipping || {};

    const shippingData = {
      weightGram:
        shipping.weightGram !== undefined
          ? Number(shipping.weightGram)
          : 300,

      extraShippingFee:
        shipping.extraShippingFee !== undefined
          ? Number(shipping.extraShippingFee)
          : 0,

      bulky:
        shipping.bulky === true || shipping.bulky === "true",
    };

    const isDefaultBool = isDefault === true || isDefault === "true";

    /* ===== create ===== */

    const [variant] = await ProductVariant.create(
      [
        {
          productId: product._id,
          sku,
          size,
          color,
          price,
          discountPrice,
          stock,
          images: uploadedImages,
          isDefault: isDefaultBool,
          shipping: shippingData,
          lowStockThreshold,
          reservedStock,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      variant,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};


/* =====================================================
   UPDATE VARIANT (admin)
===================================================== */

const updateVariant = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;

    const variant = await ProductVariant.findById(id).session(session);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    let {
      price,
      discountPrice,
      stock,
      isActive,
      isDefault,
      lowStockThreshold,
      shipping,
      keepImages,
      removeImages,
    } = req.body;

    /* ===== basic ===== */

    if (price !== undefined) variant.price = Number(price);

    if (discountPrice !== undefined) {
      const dp = discountPrice === "" ? null : Number(discountPrice);
      if (dp && dp >= variant.price) {
        return res.status(400).json({
          success: false,
          message: "Discount must be less than price",
        });
      }
      variant.discountPrice = dp;
    }

    if (stock !== undefined) {
      const newStock = Number(stock);
      if (newStock < variant.reservedStock) {
        return res.status(400).json({
          success: false,
          message: "Stock < reserved not allowed",
        });
      }
      variant.stock = newStock;
    }

    if (lowStockThreshold !== undefined) {
      variant.lowStockThreshold = Number(lowStockThreshold);
    }

    if (isActive !== undefined) {
      variant.isActive = isActive === true || isActive === "true";
    }

    if (isDefault !== undefined) {
      variant.isDefault = isDefault === true || isDefault === "true";
    }

    /* ===== shipping ===== */

    if (shipping) {
      if (shipping.weightGram !== undefined)
        variant.shipping.weightGram = Number(shipping.weightGram);

      if (shipping.extraShippingFee !== undefined)
        variant.shipping.extraShippingFee = Number(shipping.extraShippingFee);

      if (shipping.bulky !== undefined)
        variant.shipping.bulky =
          shipping.bulky === true || shipping.bulky === "true";
    }

    /* ===== IMAGE HYBRID UPDATE ===== */

    let finalImages = [];

    // keep existing selected
    if (keepImages) {
      const keepIds = JSON.parse(keepImages);
      finalImages = variant.images.filter(img =>
        keepIds.includes(img.public_id)
      );
    }

    // delete removed from cloudinary
    if (removeImages) {
      const removed = JSON.parse(removeImages);
      for (const id of removed) {
        await cloudinary.uploader.destroy(id);
      }
    }

    // upload new
    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Max 5 images allowed",
        });
      }

      for (const file of req.files) {
        const r = await uploadToCloudinary(file.buffer);
        finalImages.push({
          url: r.secure_url,
          public_id: r.public_id,
        });
      }
    }

    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image required",
      });
    }

    variant.images = finalImages;

    await variant.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, variant });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};




/* =====================================================
   STOCK ADJUST API (checkout safe)
===================================================== */

exports.adjustVariantStock = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { variantId } = req.params;
    const { mode, qty } = req.body;

    const quantity = Number(qty);

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be positive",
      });
    }

    const variant = await ProductVariant.findById(variantId).session(session);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    /* ---------------- MODES ---------------- */

    switch (mode) {

      /* reserve → cart/checkout lock */
      case "reserve":
        if (variant.availableStock < quantity) {
          return res.status(400).json({
            success: false,
            message: "Not enough available stock",
          });
        }
        variant.reservedStock += quantity;
        break;


      /* commit → order success */
      case "commit":
        if (variant.reservedStock < quantity) {
          return res.status(400).json({
            success: false,
            message: "Reserved stock too low",
          });
        }
        variant.reservedStock -= quantity;
        variant.stock -= quantity;
        break;


      /* release → cancel / payment fail */
      case "release":
        if (variant.reservedStock < quantity) {
          return res.status(400).json({
            success: false,
            message: "Reserved stock too low",
          });
        }
        variant.reservedStock -= quantity;
        break;


      /* set → admin direct stock set */
      case "set":
        if (quantity < variant.reservedStock) {
          return res.status(400).json({
            success: false,
            message: "Cannot set stock below reserved",
          });
        }
        variant.stock = quantity;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid mode",
        });
    }

    await variant.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      stock: variant.stock,
      reservedStock: variant.reservedStock,
      availableStock: variant.availableStock,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await ProductVariant.findById(id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    await variant.deleteOne();

    res.json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {createProductVariant, updateVariant, deleteVariant};