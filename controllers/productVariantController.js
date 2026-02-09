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
        const { size, color, price, discountPrice, stock, isDefault, shipping, lowStockThreshold, reservedStock, } = req.body;
        if (!size || !color || !price || stock === undefined) {
          return res.status(400).json({
            success: false,
            message: "size, color, price, stock are required",
          });
        }
        size = size.toString().toUpperCase().trim();
        color = color.toString().toLowerCase().trim();
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
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: "At least one image is required",
          });
        }
        if (req.files.length > 5) {
          return res.status(400).json({
            success: false,
            message: "Maximum 5 images are allowed",
          });
        }
        const sku = await generateSKU({
            productName: product.name,
            color,
            size,
        });
        const uploadedImages = [];

        for (const file of req.files) {
          const result = await uploadToCloudinary(file.buffer);
          uploadedImages.push({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }

        const isDefaultBool = isDefault === true || isDefault === "true";

        shipping = shipping || {};
        const shippingData = {
          weightGram: shipping.weightGram !== undefined ? Number(shipping.weightGram) : 300,
          extraShippingFee: shipping.extraShippingFee !== undefined ? Number(shipping.extraShippingFee) : 0,
          bulky: shipping.bulky === true || shipping.bulky === "true" ? true : false,
        };

        const variant = await ProductVariant.create(
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
        res.status(201).json({ success: true, variant: variant[0] });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// const updateVariant = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const variant = await ProductVariant.findById(id);
//     if (!variant) {
//       return res.status(404).json({ success: false, message: "Variant not found" });
//     }

//     const {
//       sku,
//       size,
//       color,
//       price,
//       discountPrice,
//       stock,
//       images,
//       isDefault,
//       keepImages,
//       removeImages,
//     } = req.body;

//     if (sku) variant.sku = sku;
//     if (size) variant.size = size;
//     if (color) variant.color = color;
//     if (price !== undefined) variant.price = price;
//     if (discountPrice !== undefined) variant.discountPrice = discountPrice;
//     if (stock !== undefined) variant.stock = stock;
//     if (images) variant.images = images;
//     if (typeof isDefault === "boolean") variant.isDefault = isDefault;

//       /* ---------------- IMAGE HANDLING ---------------- */

//     // images to keep (existing)
//     let finalImages = [];

//     if (keepImages) {
//       const keepIds = JSON.parse(keepImages);
//       finalImages = variant.images.filter((img) =>
//         keepIds.includes(img.public_id)
//       );
//     }

//     // delete removed images from cloudinary
//     if (removeImages) {
//       const removed = JSON.parse(removeImages);
//       for (const publicId of removed) {
//         await cloudinary.uploader.destroy(publicId);
//       }
//     }

//     // new uploaded images
//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         const result = await uploadToCloudinary(file.buffer);

//         finalImages.push({
//           url: result.secure_url,
//           public_id: result.public_id,
//         });
//       }
//     }


//     if (finalImages.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one image is required",
//       });
//     }

//     variant.images = finalImages;

//     await variant.save();

//     res.json({
//       success: true,
//       message: "Variant updated successfully",
//       variant,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

/* =====================================================
   UPDATE VARIANT (admin)
===================================================== */

const updateVariant = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const variant = await ProductVariant.findById(req.params.variantId).session(session);
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
    } = req.body;

    if (price !== undefined) {
      variant.price = Number(price);
    }

    if (discountPrice !== undefined) {
      const dp = discountPrice === null ? null : Number(discountPrice);
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
          message: "Stock cannot be less than reserved stock",
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

    /* ---------- shipping update ---------- */

    if (shipping) {
      variant.shipping.weightGram =
        shipping.weightGram !== undefined
          ? Number(shipping.weightGram)
          : variant.shipping.weightGram;

      variant.shipping.extraShippingFee =
        shipping.extraShippingFee !== undefined
          ? Number(shipping.extraShippingFee)
          : variant.shipping.extraShippingFee;

      if (shipping.bulky !== undefined) {
        variant.shipping.bulky =
          shipping.bulky === true || shipping.bulky === "true";
      }
    }

    /* ---------- image replace (optional) ---------- */

    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Max 5 images allowed",
        });
      }

      // delete old images
      for (const img of variant.images) {
        await cloudinary.uploader.destroy(img.public_id);
      }

      const newImages = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        newImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }

      variant.images = newImages;
    }

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