const mongoose = require("mongoose");

const recentlyViewedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    guestId: {
      type: String,
      trim: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

recentlyViewedSchema.index(
  { userId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

recentlyViewedSchema.index(
  { guestId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { guestId: { $exists: true, $type: "string" } } }
);

module.exports =
  mongoose.models.RecentlyViewed ||
  mongoose.model("RecentlyViewed", recentlyViewedSchema);
