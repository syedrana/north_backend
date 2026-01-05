const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Review must be for a specific product"],
    },
    rating: {
      type: Number,
      required: [true, "Please provide a rating between 1 to 5"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },
    comment: {
      type: String,
      required: [true, "Review comment cannot be empty"],
      trim: true,
      minlength: [10, "Comment must be at least 10 characters long"],
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false, // ইউজার প্রোডাক্টটি কিনলে এটি true করে দেওয়া হবে
    },
    images: [
      {
        url: String,
        public_id: String,
      }
    ],
  },
  { timestamps: true }
);

// --- এডভান্সড কনফিগারেশন ---

// ১. ডুপ্লিকেট রিভিউ আটকানো (এক ইউজার এক প্রোডাক্টে একটিই রিভিউ দিতে পারবে)
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// ২. স্ট্যাটিক মেথড: প্রোডাক্টের এভারেজ রেটিং অটো আপডেট করার জন্য
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { productId: productId } },
    {
      $group: {
        _id: "$productId",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      ratings: stats[0].avgRating.toFixed(1),
      numOfReviews: stats[0].nRating,
    });
  } else {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      ratings: 0,
      numOfReviews: 0,
    });
  }
};

// রিভিউ সেভ করার পর অটো রেটিং ক্যালকুলেট করা
reviewSchema.post("save", function () {
  this.constructor.calculateAverageRating(this.productId);
});

// রিভিউ ডিলিট করার পর অটো রেটিং ক্যালকুলেট করা
reviewSchema.post("remove", function () {
  this.constructor.calculateAverageRating(this.productId);
});

module.exports = mongoose.model("Review", reviewSchema);