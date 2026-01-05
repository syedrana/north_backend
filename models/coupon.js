const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Coupon code must be at least 3 characters"],
      maxlength: [15, "Coupon code cannot exceed 15 characters"],
    },
    discountType: {
      type: String,
      enum: {
        values: ["percentage", "flat"],
        message: "{VALUE} is not a valid discount type",
      },
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [1, "Discount must be at least 1"],
      validate: {
        validator: function (value) {
          // যদি টাইপ percentage হয়, তবে ভ্যালু ১০০ এর বেশি হতে পারবে না
          if (this.discountType === "percentage") {
            return value <= 100;
          }
          return true;
        },
        message: "Percentage discount cannot be more than 100%",
      },
    },
    maxDiscountAmount: {
      type: Number, // পার্সেন্টেজ ডিসকাউন্টের ক্ষেত্রে সর্বোচ্চ কত টাকা ছাড় পাবে (Cap limit)
      min: [0, "Max discount amount cannot be negative"],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
      validate: {
        validator: function (value) {
          // এক্সপায়ারি ডেট অবশ্যই বর্তমান সময়ের পরের হতে হবে
          return value > Date.now();
        },
        message: "Expiry date must be in the future",
      },
    },
    usageLimit: {
      type: Number, // মোট কতবার কুপনটি ব্যবহার করা যাবে (যেমন: প্রথম ১০০ জন)
      default: null, // null মানে আনলিমিটেড
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// কুপনটি বর্তমানে বৈধ কি না তা চেক করার জন্য একটি ভার্চুয়াল প্রপার্টি
couponSchema.virtual("isValid").get(function () {
  const isExpired = Date.now() > this.expiryDate;
  const isLimitReached = this.usageLimit !== null && this.usedCount >= this.usageLimit;
  return this.isActive && !isExpired && !isLimitReached;
});

module.exports = mongoose.model("Coupon", couponSchema);