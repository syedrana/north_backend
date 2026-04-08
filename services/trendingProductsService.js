const mongoose = require("mongoose");
const Product = require("../models/product");
const Order = require("../models/order");
const Wishlist = require("../models/wishlist");
const RecentlyViewed = require("../models/recentlyViewed");

const DEFAULT_LIMIT = 8;
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_WEIGHTS = {
  sales: 5,
  wishlist: 3,
  views: 1,
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseWeight = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const normalizeWeights = (weights = {}) => {
  return {
    sales: parseWeight(weights.sales, DEFAULT_WEIGHTS.sales),
    wishlist: parseWeight(weights.wishlist, DEFAULT_WEIGHTS.wishlist),
    views: parseWeight(weights.views, DEFAULT_WEIGHTS.views),
  };
};

const normalizeProduct = (product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] || null;

  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    price: firstVariant?.price ?? null,
    discountPrice: firstVariant?.discountPrice ?? null,
    image: firstVariant?.images?.[0]?.url ?? null,
  };
};

const toScoreMap = (entries = [], valueField) => {
  const map = new Map();

  for (const entry of entries) {
    if (!entry?._id) {
      continue;
    }

    map.set(String(entry._id), Number(entry[valueField]) || 0);
  }

  return map;
};

const loadProductsByIds = async ({ ids, categoryId }) => {
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) {
    return [];
  }

  const query = {
    _id: { $in: objectIds },
    isActive: true,
    isPublished: true,
  };

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    query.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  const products = await Product.find(query)
    .select("name slug categoryId createdAt")
    .populate({
      path: "variants",
      select: "price discountPrice images isDefault isActive",
      match: { isActive: true },
      options: { sort: { isDefault: -1, createdAt: 1 } },
    })
    .lean();

  return products;
};

const loadNewArrivals = async ({ limit, categoryId }) => {
  const query = {
    isActive: true,
    isPublished: true,
  };

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    query.categoryId = new mongoose.Types.ObjectId(categoryId);
  }
const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name slug categoryId")
    .populate({
      path: "variants",
      select: "price discountPrice images isDefault isActive",
      match: { isActive: true },
      options: { sort: { isDefault: -1, createdAt: 1 } },
    })
    .lean();
  return products.map(normalizeProduct);
};

const getSalesScores = async (threshold) => {
  const sales = await Order.aggregate([
    {
      $match: {
        "items.0": { $exists: true },
        createdAt: { $gte: threshold },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        salesCount: { $sum: "$items.quantity" },
      },
    },
  ]);

  return toScoreMap(sales, "salesCount");
};

const getWishlistScores = async (threshold) => {
  const wishlist = await Wishlist.aggregate([
    {
      $match: {
        updatedAt: { $gte: threshold },
        "products.0": { $exists: true },
      },
    },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products",
        wishlistCount: { $sum: 1 },
      },
    },
  ]);

  return toScoreMap(wishlist, "wishlistCount");
};

const getViewScores = async (threshold) => {
  const views = await RecentlyViewed.aggregate([
    {
      $match: {
        viewedAt: { $gte: threshold },
      },
    },
    {
      $group: {
        _id: "$productId",
        viewCount: { $sum: 1 },
      },
    },
  ]);
  return toScoreMap(views, "viewCount");
};

const getTrendingProducts = async ({
  limit = DEFAULT_LIMIT,
  windowDays = DEFAULT_WINDOW_DAYS,
  categoryId,
  weights = {},
} = {}) => {
  const safeLimit = parsePositiveInteger(limit, DEFAULT_LIMIT);
  const safeWindowDays = parsePositiveInteger(windowDays, DEFAULT_WINDOW_DAYS);
  const safeWeights = normalizeWeights(weights);

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - safeWindowDays);

  const [salesScores, wishlistScores, viewScores] = await Promise.all([
    getSalesScores(threshold),
    getWishlistScores(threshold),
    getViewScores(threshold),
  ]);

  const rankedIds = Array.from(
    new Set([
      ...salesScores.keys(),
      ...wishlistScores.keys(),
      ...viewScores.keys(),
    ])
  );

  if (!rankedIds.length) {
    return loadNewArrivals({ limit: safeLimit, categoryId });
  }

  const products = await loadProductsByIds({ ids: rankedIds, categoryId });

  if (!products.length) {
    return loadNewArrivals({ limit: safeLimit, categoryId });
  }

  const scoredProducts = products
    .map((product) => {
      const productId = String(product._id);
      const salesCount = salesScores.get(productId) || 0;
      const wishlistCount = wishlistScores.get(productId) || 0;
      const viewCount = viewScores.get(productId) || 0;

      const score =
        salesCount * safeWeights.sales +
        wishlistCount * safeWeights.wishlist +
        viewCount * safeWeights.views;

      return {
        ...normalizeProduct(product),
        score,
        salesCount,
        wishlistCount,
        viewCount,
        createdAt: product.createdAt,
      };
    })
    .sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, safeLimit)
    .map(({ createdAt, ...rest }) => rest);

  return scoredProducts;
};

module.exports = {
  DEFAULT_LIMIT,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_WEIGHTS,
  getTrendingProducts,
};
