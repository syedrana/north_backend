const { getRecentlyViewedProducts } = require("../services/recentlyViewedService");

const getRecentlyViewed = async (req, res, next) => {
  try {
    const userId = req.user?._id || null;
    const guestId = req.headers["x-guest-id"] || null;

    const recentlyViewed = await getRecentlyViewedProducts({ userId, guestId });

    const products = recentlyViewed
      .filter((item) => item.productId)
      .map((item) => ({
        viewedAt: item.viewedAt,
        product: item.productId,
      }));

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecentlyViewed,
};
