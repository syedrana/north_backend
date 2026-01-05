const mongoose = require("mongoose");
const slugify = require("slugify"); // স্লাগ তৈরির জন্য এটি ব্যবহার করা ভালো

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true, // সার্চিং ফাস্ট করার জন্য ইনডেক্স করা হলো
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// --- এডভান্সড ভ্যালিডেশন ও মিডলওয়্যার ---

// ১. অটোমেটিক স্লাগ জেনারেশন (সেভ করার আগে)
// ইউজার যদি স্লাগ না দেয়, তবে নাম থেকে অটো স্লাগ তৈরি হবে (যেমন: "Electronics Items" -> "electronics-items")
categorySchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// ২. প্রিভেন্ট সেলফ-প্যারেন্টিং (নিজেকে নিজের প্যারেন্ট বানানো আটকানো)
categorySchema.pre("save", function (next) {
  if (this.parentId && this.parentId.equals(this._id)) {
    return next(new Error("A category cannot be its own parent."));
  }
  next();
});

module.exports = mongoose.model("Category", categorySchema);