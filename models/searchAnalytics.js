const mongoose = require("mongoose");

const searchAnalyticsSchema = new mongoose.Schema(
  {
    keyword: {
        type: String,
        required: [true, "Keyword is required"],
        trim: true, 
        lowercase: true,
        index: true,
    },
    userId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: false, 
      index: true,
    },
    resultCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
  },
  { timestamps: true }
);

searchAnalyticsSchema.index({ keyword: 1, createdAt: -1 });

module.exports = mongoose.model(
  "SearchAnalytics",
  searchAnalyticsSchema
);