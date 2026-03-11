const mongoose = require("mongoose");
const Product = require("../models/product");
const Order = require("../models/order");

const DEFAULT_LIMIT = 8;

const parseLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
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

const fetchProductsByFilter = async (filter, { limit, sort } = {}) => {
  const query = {
    isActive: true,
    isPublished: true,
    ...filter,
  };

  const products = await Product.find(query)
    .sort(sort || { createdAt: -1 })
    .limit(parseLimit(limit))
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

const getManualProducts = async (productIds = []) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return [];
  }

  const validIds = productIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validIds.length === 0) {
    return [];
  }

  const products = await Product.find({
    _id: { $in: validIds },
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

  const productMap = new Map(products.map((p) => [String(p._id), normalizeProduct(p)]));

  return validIds
    .map((id) => productMap.get(String(id)))
    .filter(Boolean);
};

const getTrendingProducts = async (limit) => {
  const topIds = await Order.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        score: { $sum: "$items.quantity" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: parseLimit(limit) },
  ]);

  if (!topIds.length) {
    return getNewArrivalProducts(limit);
  }

  return getManualProducts(topIds.map((entry) => entry._id));
};

const getBestSellerProducts = async (limit) => {
  const topIds = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        sold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { sold: -1 } },
    { $limit: parseLimit(limit) },
  ]);

  if (!topIds.length) {
    return [];
  }

  return getManualProducts(topIds.map((entry) => entry._id));
};

const getNewArrivalProducts = async (limit) => {
  return fetchProductsByFilter({}, { limit, sort: { createdAt: -1 } });
};

const getCategoryProducts = async (categoryId, limit) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return [];
  }

  return fetchProductsByFilter(
    { categoryId: new mongoose.Types.ObjectId(categoryId) },
    { limit, sort: { createdAt: -1 } }
  );
};

module.exports = {
  getManualProducts,
  getTrendingProducts,
  getBestSellerProducts,
  getNewArrivalProducts,
  getCategoryProducts,
};
