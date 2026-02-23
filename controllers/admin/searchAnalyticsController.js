const SearchAnalytics = require("../../models/searchAnalytics");

exports.trackSearch = async (req, res) => {
  try {
    const { keyword, resultCount, sessionId } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required",
      });
    }

    const analytics = await SearchAnalytics.create({
      keyword: keyword,
      resultCount: resultCount,
      userId: req.user ? req.user._id : null,
      sessionId: sessionId,
      device: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "Search tracked successfully",
      data: analytics,   // ✅ VERY IMPORTANT
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

exports.updateClickedProduct = async (req, res) => {
  try {
    const { searchId, productId, position } = req.body;

    // ভ্যালিডেশন: যদি আইডিগুলো না থাকে
    if (!searchId || !productId) {
      return res.status(400).json({ success: false, message: "Search ID and Product ID are required" });
    }

    const updatedData = await SearchAnalytics.findByIdAndUpdate(
      searchId, 
      { 
        clickedProduct: productId,
        clickPosition: position, 
      },
      { new: true } // এটি নতুন আপডেট হওয়া ডাটাটি রিটার্ন করবে
    );

    if (!updatedData) {
      return res.status(404).json({ success: false, message: "Search record not found" });
    }

    res.json({ success: true, message: "Click tracked!", data: updatedData });
  } catch (err) {
    console.error("Update Click Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const totalSearches = await SearchAnalytics.countDocuments();

    const uniqueKeywords = await SearchAnalytics.distinct("keyword");

    const zeroResults = await SearchAnalytics.countDocuments({
      resultCount: 0,
    });

    const clickedSearches = await SearchAnalytics.countDocuments({
      clickedProduct: { $ne: null },
    });

    const ctr =
      totalSearches === 0
        ? 0
        : ((clickedSearches / totalSearches) * 100).toFixed(2);

    const topKeywords = await SearchAnalytics.aggregate([
      {
        $group: {
          _id: "$keyword",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const recentSearches = await SearchAnalytics.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("keyword resultCount createdAt");

    res.json({
      success: true,
      data: {
        totalSearches,
        uniqueKeywords: uniqueKeywords.length,
        zeroResults,
        clickedSearches,
        ctr,
        topKeywords,
        recentSearches,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};


exports.getOverview = async (req, res) => {
  const { from, to } = req.query;

  const match = {
    createdAt: {
      $gte: new Date(from),
      $lte: new Date(to),
    },
  };

  const totalSearches = await SearchAnalytics.countDocuments(match);

  const totalClicks = await SearchAnalytics.countDocuments({
    ...match,
    clickedProduct: { $ne: null },
  });

  const zeroResults = await SearchAnalytics.countDocuments({
    ...match,
    resultCount: 0,
  });

  const ctr = totalClicks / (totalSearches || 1);

  res.json({
    totalSearches,
    totalClicks,
    zeroResults,
    ctr,
  });
};


exports.getKeywordAnalytics = async (req, res) => {
  const data = await SearchAnalytics.aggregate([
    {
      $group: {
        _id: "$keyword",
        searches: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{ $ifNull: ["$clickedProduct", false] }, 1, 0],
          },
        },
      },
    },
    {
      $addFields: {
        ctr: { $divide: ["$clicks", "$searches"] },
      },
    },
    { $sort: { searches: -1 } },
  ]);

  res.json(data);
};


exports.getSessions = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const sessions = await SearchAnalytics.find()
    .populate("userId", "firstName email")
    .populate("clickedProduct", "name slug")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(sessions);
};