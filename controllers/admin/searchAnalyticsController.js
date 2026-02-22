const SearchAnalytics = require("../../models/searchAnalytics");

exports.trackSearch = async (req, res) => {
  try {
    const { keyword, resultCount } = req.body;

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
    const { searchId, productId } = req.body;

    // ভ্যালিডেশন: যদি আইডিগুলো না থাকে
    if (!searchId || !productId) {
      return res.status(400).json({ success: false, message: "Search ID and Product ID are required" });
    }

    const updatedData = await SearchAnalytics.findByIdAndUpdate(
      searchId, 
      { clickedProduct: productId },
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

    const zeroResults = await SearchAnalytics.countDocuments({
      resultCount: 0,
    });

    res.json({
      success: true,
      data: {
        topKeywords,
        zeroResults,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};