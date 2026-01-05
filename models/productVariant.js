const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Main Product ID is required"],
    },
    sku: {
      type: String,
      required: [true, "SKU (Stock Keeping Unit) is required"],
      unique: true,
      trim: true,
      uppercase: true, // SKU সাধারণত বড় হাতের হয়
    },
    size: {
      type: String,
      required: [true, "Size is required"],
      enum: {
        values: ["XS", "S", "M", "L", "XL", "XXL", "FREE"],
        message: "{VALUE} is not a valid size",
      },
    },
    color: {
      type: String,
      required: [true, "Color is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: 0,
      validate: {
        // ডিসকাউন্ট প্রাইস চেক
        validator: function (value) {
          return value < this.price;
        },
        message: "Discount price ({VALUE}) must be less than regular price",
      },
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    images: {
      type: [
        {
          url: {
            type: String,
            required: [true, "Image URL is required"],
            validate: {
              validator: (v) => /^https?:\/\/.+/.test(v), // ইউআরএল ফরম্যাট চেক
              message: "Invalid Image URL format",
            },
          },
          public_id: {
            type: String,
            required: [true, "Cloudinary Public ID is required"],
          },
        },
      ],
      validate: {
        validator: function (v) {
          return v.length >= 1 && v.length <= 5; // কমপক্ষে ১টি এবং সর্বোচ্চ ৫টি ছবি
        },
        message: "You must upload between 1 to 5 images per variant",
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ইনডেক্সিং (দ্রুত সার্চের জন্য)
productVariantSchema.index({ productId: 1, sku: 1 });

module.exports = mongoose.model("ProductVariant", productVariantSchema);