const mongoose = require("mongoose");
const Product = require("../models/product");
const Wishlist = require("../models/wishlist");
const Order = require("../models/order");
const RecentlyViewed = require("../models/recentlyViewed");

const DEFAULT_LIMIT = 10;

const toObjectIdString = (id) => id?.toString();

const getUserInteractionProductIds = async (userId) => {
  if (!userId) return [];

  const [recentlyViewed, wishlist, orders] = await Promise.all([
    RecentlyViewed.find({ userId }).select("productId").lean(),
    Wishlist.findOne({ userId }).select("products").lean(),
    Order.find({ userId }).select("items.productId").lean(),
  ]);

  const productIdSet = new Set();

  for (const item of recentlyViewed) {
    if (item?.productId) {
      productIdSet.add(toObjectIdString(item.productId));
    }
  }

  for (const productId of wishlist?.products || []) {
    if (productId) {
      productIdSet.add(toObjectIdString(productId));
    }
  }

  for (const order of orders) {
    for (const item of order.items || []) {
      if (item?.productId) {
        productIdSet.add(toObjectIdString(item.productId));
      }
    }
  }

  return [...productIdSet]
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));
};

const buildSimilaritySignals = (seedProducts) => {
  const categoryIdSet = new Set();
  const brandSet = new Set();

  for (const product of seedProducts) {
    if (product?.categoryId) {
      categoryIdSet.add(toObjectIdString(product.categoryId));
    }

    if (product?.brand) {
      brandSet.add(product.brand);
    }
  }

  return {
    categoryIds: [...categoryIdSet]
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id)),
    brands: [...brandSet].filter(Boolean),
  };
};

const getRecommendedProducts = async ({ userId, limit = DEFAULT_LIMIT }) => {
  if (!userId) {
    return [];
  }

  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_LIMIT;

  const interactedProductIds = await getUserInteractionProductIds(userId);

  if (interactedProductIds.length === 0) {
    return [];
  }

  const seedProducts = await Product.find({ _id: { $in: interactedProductIds } })
    .select("categoryId brand")
    .lean();

  const { categoryIds, brands } = buildSimilaritySignals(seedProducts);

  if (categoryIds.length === 0 && brands.length === 0) {
    return [];
  }

  const recommendedProducts = await Product.aggregate([
    {
      $match: {
        isActive: true,
        isPublished: true,
        _id: { $nin: interactedProductIds },
        $or: [
          ...(categoryIds.length > 0 ? [{ categoryId: { $in: categoryIds } }] : []),
          ...(brands.length > 0 ? [{ brand: { $in: brands } }] : []),
        ],
      },
    },
    {
      $addFields: {
        categoryMatch: {
          $cond: [{ $in: ["$categoryId", categoryIds] }, 1, 0],
        },
        brandMatch: {
          $cond: [{ $in: ["$brand", brands] }, 1, 0],
        },
      },
    },
    {
      $addFields: {
        recommendationScore: {
          $add: [
            { $multiply: ["$categoryMatch", 2] },
            { $multiply: ["$brandMatch", 1] },
          ],
        },
      },
    },
    { $sort: { recommendationScore: -1, createdAt: -1 } },
    { $limit: safeLimit },
    {
      $project: {
        name: 1,
        slug: 1,
        brand: 1,
        categoryId: 1,
        recommendationScore: 1,
      },
    },
  ]);

  return recommendedProducts;
};

module.exports = {
  getRecommendedProducts,
};
