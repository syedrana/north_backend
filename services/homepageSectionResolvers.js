const mongoose = require("mongoose");
const Category = require("../models/category");
const Product = require("../models/product");
const Order = require("../models/order");

const DEFAULT_PRODUCT_LIMIT = 8;
const DEFAULT_CATEGORY_LIMIT = 8;
const TRENDING_WINDOW_DAYS = 30;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
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

const loadProductsByQuery = async ({ query, sort, limit }) => {
  const products = await Product.find(query)
    .sort(sort)
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

const loadProductsByIds = async ({ ids, limit }) => {
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) {
    return [];
  }

  const products = await Product.find({
    _id: { $in: objectIds },
    isActive: true,
    isPublished: true,
  })
    .select("name slug categoryId")
    .populate({
      path: "variants",
      select: "price discountPrice images isDefault isActive",
      match: { isActive: true },
      options: { sort: { isDefault: -1, createdAt: 1 } },
    })
    .lean();

  const orderMap = new Map(objectIds.map((id, index) => [String(id), index]));

  return products
    .sort((a, b) => (orderMap.get(String(a._id)) ?? 99999) - (orderMap.get(String(b._id)) ?? 99999))
    .slice(0, limit)
    .map(normalizeProduct);
};

const getProductSource = async (source, settings, limit) => {
  const baseQuery = {
    isActive: true,
    isPublished: true,
  };

  if (
    settings.categoryId &&
    mongoose.Types.ObjectId.isValid(settings.categoryId)
  ) {
    baseQuery.categoryId = settings.categoryId;
  }

  if (source === "manual") {
    const productIds = Array.isArray(settings.productIds)
      ? settings.productIds
      : [];

    return loadProductsByIds({ ids: productIds, limit });
  }

  if (source === "new_arrival") {
    return loadProductsByQuery({
      query: baseQuery,
      sort: { createdAt: -1 },
      limit,
    });
  }

  if (source === "best_seller" || source === "trending") {
    const matchStage = {
      "items.0": { $exists: true },
    };

    if (source === "trending") {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - TRENDING_WINDOW_DAYS);
      matchStage.createdAt = { $gte: threshold };
    }

    const topProducts = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          score: { $sum: "$items.quantity" },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit * 3 },
    ]);

    const rankedIds = topProducts.map((entry) => entry._id).filter(Boolean);
    const rankedSet = new Set(rankedIds.map((id) => String(id)));

    const products = await loadProductsByIds({ ids: rankedIds, limit: limit * 3 });
    const sortedProducts = products
      .filter((product) => rankedSet.has(String(product._id)))
      .sort(
        (a, b) =>
          rankedIds.findIndex((id) => String(id) === String(a._id)) -
          rankedIds.findIndex((id) => String(id) === String(b._id))
      )
      .slice(0, limit);

    if (sortedProducts.length) {
      return sortedProducts;
    }

    return loadProductsByQuery({
      query: baseQuery,
      sort: { createdAt: -1 },
      limit,
    });
  }

  return loadProductsByQuery({
    query: baseQuery,
    sort: { createdAt: -1 },
    limit,
  });
};

const resolveHeroBanner = async (settings = {}) => {
  return {
    banners: Array.isArray(settings.banners) ? settings.banners : [],
    ...settings,
  };
};

const resolveCategoryGrid = async (settings = {}) => {
  const limit = parsePositiveInteger(settings.limit, DEFAULT_CATEGORY_LIMIT);

  const categories = await Category.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name slug parentId")
    .lean();

  return {
    categories,
  };
};

const resolveProductGrid = async (settings = {}) => {
  const limit = parsePositiveInteger(settings.limit, DEFAULT_PRODUCT_LIMIT);
  const source =
    settings.source &&
    ["manual", "trending", "best_seller", "new_arrival"].includes(settings.source)
      ? settings.source
      : "new_arrival";

  const products = await getProductSource(source, settings, limit);

  return {
    source,
    products,
  };
};

const resolveCampaignBanner = async (settings = {}) => {
  return {
    campaigns: Array.isArray(settings.campaigns) ? settings.campaigns : [],
    ...settings,
  };
};

module.exports = {
  resolveHeroBanner,
  resolveCategoryGrid,
  resolveProductGrid,
  resolveCampaignBanner,
};
