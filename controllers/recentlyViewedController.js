const { trackProductView, getRecentlyViewedProducts } = require("../services/recentlyViewedService");
const { v4: uuidv4 } = require("uuid");

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

const trackRecentlyViewed = async (req, res) => {
  try {
    let userId = req.user?._id || null;
    let guestId = req.cookies?.guestId || null;

    // 🔥 Auto guestId create
    if (!userId && !guestId) {
      guestId = uuidv4();

      res.cookie("guestId", guestId, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
    }

    await trackProductView({
      userId,
      guestId,
      productId: req.body.productId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Track Recently Viewed Error:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  getRecentlyViewed,
  trackRecentlyViewed,
};
