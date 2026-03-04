const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    // guestId: {
    //   type: String,
    // },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

/**
 * Unique Index (only when field exists)
 */
wishlistSchema.index({ userId: 1 }, { unique: true, sparse: true });
// wishlistSchema.index({ guestId: 1 }, { unique: true, sparse: true });

wishlistSchema.pre("save", function () {
  const uniqueProducts = [...new Set(this.products.map((id) => id.toString()))];
  if (this.products.length !== uniqueProducts.length) {
    this.products = uniqueProducts;
  }
});

wishlistSchema.pre(/^find/, function () {
  this.populate({
    path: "products",
    select: "name slug brand isActive isPublished",
  });
});

module.exports =
  mongoose.models.Wishlist ||
  mongoose.model("Wishlist", wishlistSchema);