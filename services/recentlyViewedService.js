const RecentlyViewed = require("../models/recentlyViewed");

const MAX_RECENTLY_VIEWED_ITEMS = 10;

const buildIdentityFilter = ({ userId, guestId }) => {
  if (userId) return { userId };
  if (guestId) return { guestId };
  return null;
};

const trackProductView = async ({ userId = null, guestId = null, productId }) => {
  const identityFilter = buildIdentityFilter({ userId, guestId });

  if (!identityFilter || !productId) return;

  await RecentlyViewed.findOneAndUpdate(
    { ...identityFilter, productId },
    {
      $set: {
        ...identityFilter,
        productId,
        viewedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const docs = await RecentlyViewed.find(identityFilter)
    .sort({ viewedAt: -1 })
    .skip(MAX_RECENTLY_VIEWED_ITEMS)
    .select("_id")
    .lean();

  if (docs.length > 0) {
    await RecentlyViewed.deleteMany({ _id: { $in: docs.map((doc) => doc._id) } });
  }
};

const getRecentlyViewedProducts = async ({ userId = null, guestId = null }) => {
  const identityFilter = buildIdentityFilter({ userId, guestId });

  if (!identityFilter) {
    return [];
  }

  return RecentlyViewed.find(identityFilter)
    .sort({ viewedAt: -1 })
    .limit(MAX_RECENTLY_VIEWED_ITEMS)
    .populate({
      path: "productId",
      select: "name slug brand categoryId isActive isPublished",
      match: { isActive: true, isPublished: true },
    })
    .lean();
};

module.exports = {
  MAX_RECENTLY_VIEWED_ITEMS,
  trackProductView,
  getRecentlyViewedProducts,
};
