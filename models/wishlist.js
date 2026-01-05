const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Wishlist must belong to a user"],
      unique: true, // একজন ইউজারের জন্য কেবল একটি উইশলিস্ট ডকুমেন্ট থাকবে
      index: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product ID is required"],
      },
    ],
  },
  { 
    timestamps: true 
  }
);

// --- এডভান্সড ভ্যালিডেশন ও মিডলওয়্যার ---

// ১. ডুপ্লিকেট প্রোডাক্ট সেভ হওয়া আটকানো
// সেভ করার আগে আমরা নিশ্চিত করবো যে অ্যারের ভেতর একই আইডি দুইবার নেই
wishlistSchema.pre("save", function (next) {
  const uniqueProducts = [...new Set(this.products.map((id) => id.toString()))];
  if (this.products.length !== uniqueProducts.length) {
    this.products = uniqueProducts;
  }
  next();
});

// ২. অটো-পপুলেট মিডলওয়্যার (অপশনাল কিন্তু হেল্পফুল)
// যখনই উইশলিস্ট খোঁজা হবে, প্রোডাক্টের ডিটেইলস অটোমেটিক চলে আসবে
wishlistSchema.pre(/^find/, function (next) {
  this.populate({
    path: "products",
    select: "name slug images price", // শুধু প্রয়োজনীয় ফিল্ডগুলো আনবে
  });
  next();
});

module.exports = mongoose.model("Wishlist", wishlistSchema);