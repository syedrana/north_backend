const {
  getTrendingProducts,
  DEFAULT_WEIGHTS,
} = require("../services/trendingProductsService");

const getHomepageTrendingProducts = async (req, res, next) => {
  try {
    const {
      limit,
      windowDays,
      categoryId,
      salesWeight,
      wishlistWeight,
      viewWeight,
    } = req.query;

    const weights = {
      sales: salesWeight,
      wishlist: wishlistWeight,
      views: viewWeight,
    };

    const products = await getTrendingProducts({
      limit,
      windowDays,
      categoryId,
      weights,
    });

    res.status(200).json({
      success: true,
      source: "trending_hybrid",
      count: products.length,
      weights: {
        sales: Number.isFinite(Number(salesWeight)) ? Number(salesWeight) : DEFAULT_WEIGHTS.sales,
        wishlist: Number.isFinite(Number(wishlistWeight)) ? Number(wishlistWeight) : DEFAULT_WEIGHTS.wishlist,
        views: Number.isFinite(Number(viewWeight)) ? Number(viewWeight) : DEFAULT_WEIGHTS.views,
      },
      products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHomepageTrendingProducts,
};
