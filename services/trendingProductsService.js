const Product = require("../models/product");

const VIEW_WEIGHT = 1;
const WISHLIST_WEIGHT = 3;
const CART_ADDS_WEIGHT = 2;
const ORDER_WEIGHT = 5;

const getTrendingProducts = async (limit = 10) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

  const products = await Product.aggregate([
    {
      $match: {
        isActive: true,
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "wishlists",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$$productId", "$products"] },
            },
          },
          { $count: "count" },
        ],
        as: "wishlistStats",
      },
    },
    {
      $lookup: {
        from: "carts",
        let: { productId: "$_id" },
        pipeline: [
          { $unwind: "$items" },
          {
            $match: {
              $expr: { $eq: ["$items.productId", "$$productId"] },
            },
          },
          {
            $group: {
              _id: null,
              totalAdds: { $sum: "$items.quantity" },
            },
          },
        ],
        as: "cartStats",
      },
    },
    {
      $lookup: {
        from: "orders",
        let: { productId: "$_id" },
        pipeline: [
          { $unwind: "$items" },
          {
            $match: {
              $expr: { $eq: ["$items.productId", "$$productId"] },
            },
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: "$items.quantity" },
            },
          },
        ],
        as: "orderStats",
      },
    },
    {
      $addFields: {
        views: { $ifNull: ["$views", 0] },
        wishlistCount: {
          $ifNull: [{ $arrayElemAt: ["$wishlistStats.count", 0] }, 0],
        },
        cartAdds: {
          $ifNull: [{ $arrayElemAt: ["$cartStats.totalAdds", 0] }, 0],
        },
        orderCount: {
          $ifNull: [{ $arrayElemAt: ["$orderStats.totalOrders", 0] }, 0],
        },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ["$views", VIEW_WEIGHT] },
            { $multiply: ["$wishlistCount", WISHLIST_WEIGHT] },
            { $multiply: ["$cartAdds", CART_ADDS_WEIGHT] },
            { $multiply: ["$orderCount", ORDER_WEIGHT] },
          ],
        },
      },
    },
    { $sort: { score: -1, createdAt: -1 } },
    { $limit: safeLimit },
    {
      $project: {
        name: 1,
        slug: 1,
        brand: 1,
        categoryId: 1,
        score: 1,
        views: 1,
        wishlistCount: 1,
        cartAdds: 1,
        orderCount: 1,
      },
    },
  ]);

  return products;
};

module.exports = {
  getTrendingProducts,
};
