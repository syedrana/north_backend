// const Wishlist = require("../models/wishlist");
// const Product = require("../models/Product");
// const redis = require("../config/redis");
// const { v4: uuidv4 } = require("uuid");

// const CACHE_TTL = 60 * 10;

// /* ===========================
//    OWNER HELPER
// =========================== */
// const getOwner = (req, res) => {
//   const userId = req.user?._id || null;
//   let guestId = req.cookies?.guestId || null;

//   if (!userId) {
//     if (!guestId) {
//       guestId = uuidv4();
//       res.cookie("guestId", guestId, {
//         httpOnly: true,
//         sameSite: "lax",
//         maxAge: 1000 * 60 * 60 * 24 * 30,
//       });
//     }
//   }

//   return {
//     userId,
//     guestId: userId ? null : guestId,
//   };
// };

// /* ===========================
//    GET Wishlist (NO CREATE)
// =========================== */
// exports.getWishlist = async (req, res) => {
//   try {
//     const owner = getOwner(req, res);

//     const cacheKey = owner.userId
//       ? `wishlist:user:${owner.userId}`
//       : `wishlist:guest:${owner.guestId}`;

//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       return res.json({
//         success: true,
//         wishlist: JSON.parse(cached),
//         cached: true,
//       });
//     }

//     let wishlist;

//     if (owner.userId) {
//       wishlist = await Wishlist.findOne({ userId: owner.userId });
//     } else {
//       wishlist = await Wishlist.findOne({ guestId: owner.guestId });
//     }

//     if (!wishlist) {
//       wishlist = await Wishlist.create({
//         ...filter,
//         products: [],
//       });
//     }

//     await redis.set(cacheKey, JSON.stringify(wishlist.products), "EX", CACHE_TTL);

//     res.json({
//       success: true,
//       products: wishlist.products,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false });
//   }
// };

// /* ===========================
//    TOGGLE Wishlist (UPSERT SAFE)
// =========================== */
// exports.toggleWishlist = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Login required" });
//     }

//     const { productId } = req.body;
//     if (!productId) {
//       return res.status(400).json({ success: false, message: "ProductId required" });
//     }

//     const exists = await Product.exists({ _id: productId });
//     if (!exists) {
//       return res.status(404).json({ success: false, message: "Product not found" });
//     }

//     const filter = { userId };
//     let wishlist = await Wishlist.findOne(filter);

//     let action;

//     if (wishlist?.products?.some(p => p._id?.toString() === productId || p.toString() === productId)) {
//       // Remove product
//       wishlist = await Wishlist.findOneAndUpdate(
//         filter,
//         { $pull: { products: productId } },
//         { new: true }
//       );
//       action = "removed";
//     } else {
//       // Add product
//       wishlist = await Wishlist.findOneAndUpdate(
//         filter,
//         { $addToSet: { products: productId }, $setOnInsert: filter },
//         { new: true, upsert: true }
//       );
//       action = "added";
//     }

//     res.json({ success: true, action, wishlist });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false });
//   }
// };



// /* ===========================
//    CLEAR Wishlist
// =========================== */
// exports.clearWishlist = async (req, res) => {
//   try {
//     const owner = getOwner(req, res);

//     const filter = owner.userId
//       ? { userId: owner.userId }
//       : { guestId: owner.guestId };

//     await Wishlist.updateOne(filter, { $set: { products: [] } });

//     await redis.del(
//       owner.userId
//         ? `wishlist:user:${owner.userId}`
//         : `wishlist:guest:${owner.guestId}`
//     );

//     res.json({ success: true });
//   } catch {
//     res.status(500).json({ success: false });
//   }
// };

// /* ===========================
//    MERGE AFTER LOGIN
// =========================== */
// exports.mergeWishlistAfterLogin = async (req, res) => {
//   const session = await Wishlist.startSession();
//   session.startTransaction();

//   try {
//     const userId = req.user._id;
//     const guestId = req.cookies?.guestId;

//     if (!guestId) {
//       await session.commitTransaction();
//       return res.json({ success: true });
//     }

//     const guestWishlist = await Wishlist.findOne({ guestId }).session(session);
//     if (!guestWishlist) {
//       await session.commitTransaction();
//       return res.json({ success: true });
//     }

//     const userWishlist = await Wishlist.findOneAndUpdate(
//       { userId },
//       {
//         $addToSet: {
//           products: { $each: guestWishlist.products },
//         },
//       },
//       { upsert: true, new: true, session }
//     );

//     await Wishlist.deleteOne({ guestId }).session(session);

//     await session.commitTransaction();
//     session.endSession();

//     res.clearCookie("guestId");

//     await redis.del(`wishlist:user:${userId}`);
//     await redis.del(`wishlist:guest:${guestId}`);

//     res.json({
//       success: true,
//       wishlist: userWishlist,
//     });
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     res.status(500).json({ success: false });
//   }
// };

// /* ===========================
//    COUNT
// =========================== */
// // exports.getWishlistCount = async (req, res) => {
// //   try {
// //     const owner = getOwner(req, res);

// //     const filter = owner.userId
// //       ? { userId: owner.userId }
// //       : { guestId: owner.guestId };

// //     const wishlist = await Wishlist.findOne(filter).select("products");

// //     res.json({
// //       success: true,
// //       count: wishlist?.products?.length || 0,
// //     });
// //   } catch {
// //     res.json({ success: true, count: 0 });
// //   }
// // };







// exports.getWishlistCount = async (req, res) => {
//   try {
//     const userId = req.user?._id;

//     if (!userId) {
//       return res.json({ success: true, count: 0 });
//     }

//     const wishlist = await Wishlist.findOne({ userId }).select("products");

//     res.json({
//       success: true,
//       count: wishlist?.products?.length || 0,
//     });

//   } catch {
//     res.json({ success: true, count: 0 });
//   }
// };










const mongoose = require("mongoose");
const Wishlist = require("../models/wishlist");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureProductIsWishlistReady = async (productId) => {
  return Product.findOne({
    _id: productId,
    isActive: true,
    isPublished: true,
  }).select("_id");
};

const buildVariantMap = async (productIds = []) => {
  if (!productIds.length) return new Map();

  const objectIds = productIds.map((id) => new mongoose.Types.ObjectId(id));

  const variants = await ProductVariant.aggregate([
    {
      $match: {
        productId: { $in: objectIds },
        isActive: true,
      },
    },
    {
      $addFields: {
        effectivePrice: { $ifNull: ["$discountPrice", "$price"] },
      },
    },
    {
      $sort: {
        isDefault: -1,
        effectivePrice: 1,
        createdAt: 1,
      },
    },
    {
      $group: {
        _id: "$productId",
        variant: { $first: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 1,
        price: "$variant.price",
        discountPrice: "$variant.discountPrice",
        effectivePrice: "$variant.effectivePrice",
        stock: "$variant.stock",
        color: "$variant.color",
        size: "$variant.size",
        image: { $arrayElemAt: ["$variant.images.url", 0] },
      },
    },
  ]);

  return new Map(variants.map((item) => [item._id.toString(), item]));
};

const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id }).lean();

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is empty",
        wishlist: [],
        totalItems: 0,
      });
    }

    const activeProducts = wishlist.products.filter(
      (product) => product && product.isActive && product.isPublished
    );

    const productIds = activeProducts.map((product) => product._id.toString());
    const variantMap = await buildVariantMap(productIds);

    const wishlistItems = activeProducts.map((product) => ({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      preview: variantMap.get(product._id.toString()) || null,
    }));

    return res.status(200).json({
      success: true,
      wishlist: wishlistItems,
      totalItems: wishlistItems.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getWishlistCount = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id }).lean();

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        count: 0,
      });
    }

    return res.status(200).json({
      success: true,
      count: wishlist.products.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid productId is required",
      });
    }

    const product = await ensureProductIsWishlistReady(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existing = await Wishlist.findOne({ userId: req.user._id }).select("products");
    const alreadyAdded =
      !!existing && existing.products.some((id) => id.toString() === productId);

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: req.user._id },
      { $addToSet: { products: productId } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      added: !alreadyAdded,
      message: alreadyAdded
        ? "Product already exists in wishlist"
        : "Product added to wishlist",
      totalItems: wishlist.products.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid productId is required",
      });
    }

    const existing = await Wishlist.findOne({ userId: req.user._id }).select("products");

    if (!existing) {
      return res.status(200).json({
        success: true,
        removed: false,
        message: "Wishlist is already empty",
        totalItems: 0,
      });
    }

    const wasPresent = existing.products.some((id) => id.toString() === productId);

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { products: productId } },
      { new: true }
    );

    if (!wishlist || !wishlist.products.length) {
      if (wishlist?._id) {
        await Wishlist.deleteOne({ _id: wishlist._id });
      }
      return res.status(200).json({
        success: true,
        removed: wasPresent,
        message: wasPresent
          ? "Product removed from wishlist"
          : "Product is not in wishlist",
        totalItems: 0,
      });
    }

    return res.status(200).json({
      success: true,
      removed: wasPresent,
      message: wasPresent
        ? "Product removed from wishlist"
        : "Product is not in wishlist",
      totalItems: wishlist.products.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid productId is required",
      });
    }

    const product = await ensureProductIsWishlistReady(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let wishlist = await Wishlist.findOne({ userId: req.user._id }).select("products");

    console.log("wishlist :", wishlist);

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: req.user._id,
        products: [productId],
      });

      return res.status(200).json({
        success: true,
        action: "added",
        message: "Product added to wishlist",
        totalItems: wishlist.products.length,
      });
    }

    const exists = wishlist?.products?.some((p) => p._id?.toString() === productId);

    console.log("exists :", exists);

    if (exists) {
      wishlist.products = wishlist?.products?.filter((p) =>  p._id?.toString() !== productId);

      if (!wishlist.products.length) {
        await Wishlist.deleteOne({ _id: wishlist._id });
        return res.status(200).json({
          success: true,
          action: "removed",
          message: "Product removed from wishlist",
          totalItems: 0,
        });
      }

      await wishlist.save();
      return res.status(200).json({
        success: true,
        action: "removed",
        message: "Product removed from wishlist",
        totalItems: wishlist.products.length,
      });
    }

    wishlist.products.push(productId);
    await wishlist.save();

    return res.status(200).json({
      success: true,
      action: "added",
      message: "Product added to wishlist",
      totalItems: wishlist.products.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getWishlist,
  getWishlistCount,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
};
