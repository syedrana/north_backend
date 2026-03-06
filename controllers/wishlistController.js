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
