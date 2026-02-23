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
      ref: "Customer", 
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
    clickPosition: Number,

    sessionId: {
      type: String, 
      required: false, 
      index: true
    },

    device: String,

    revenue: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

searchAnalyticsSchema.index({ keyword: 1, createdAt: -1 });
searchAnalyticsSchema.index({ sessionId: 1 });

module.exports = mongoose.model(
  "SearchAnalytics",
  searchAnalyticsSchema
);