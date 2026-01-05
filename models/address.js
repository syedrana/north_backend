const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Address must be linked to a user"],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Recipient full name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
    },
    phone: {
      type: String,
      required: [true, "Contact phone number is required"],
      validate: {
        validator: function (v) {
          // বাংলাদেশি ফোন নম্বর ভ্যালিডেশন
          return /^01[3-9]\d{8}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid Bangladeshi phone number!`,
      },
    },
    division: {
      type: String,
      required: [true, "Division is required"],
      trim: true,
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area/Upazila is required"],
      trim: true,
    },
    addressLine: {
      type: String,
      required: [true, "Detailed address line is required"],
      trim: true,
    },
    addressType: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// --- এডভান্সড লজিক (Middleware) ---

// ১. নতুন ডিফল্ট অ্যাড্রেস সেট করলে পুরনোটি অটোমেটিক ফলস করা (Optional Logic for Controller)
// যদিও এটি কন্ট্রোলারে হ্যান্ডেল করা ভালো, তবে আমরা নিশ্চিত করবো ডাটাবেস লেভেলে স্বচ্ছতা।

addressSchema.pre("save", async function (next) {
  // যদি এই অ্যাড্রেসটি ডিফল্ট হিসেবে সেট করা হয়
  if (this.isDefault) {
    // ইউজারের অন্য সব অ্যাড্রেস থেকে isDefault সরিয়ে দেওয়া
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model("Address", addressSchema);