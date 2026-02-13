const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Main Product ID is required"],
      index: true,
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
      uppercase: true,
      trim: true,
    },
    color: {
      type: String,
      required: [true, "Color is required"],
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
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
          return Array.isArray(v) && v.length >= 1 && v.length <= 5;
        },
        message: "You must upload between 1 to 5 images per variant",
      },
    },
    shipping: {
      weightGram: {
        type: Number,
        default: 300,
        min: [0, "Weight cannot be negative"],
      },
      extraShippingFee: {
        type: Number,
        default: 0,
        min: [0, "Extra shipping fee cannot be negative"],
      },
      bulky: {
        type: Boolean,
        default: false,
      },
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: { 
      type: Boolean, 
      default: true, 
      index: true 
    },
    
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }

);

/* ---------- INDEXES ---------- */

productVariantSchema.index(
  { productId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);
productVariantSchema.index(
  { productId: 1, size: 1, color: 1 },
  { unique: true }
);
productVariantSchema.index({
  productId: 1,
  isActive: 1,
  stock: 1
});


/* ---------- VIRTUALS ---------- */

productVariantSchema.virtual("effectivePrice").get(function() {
  return this.discountPrice || this.price;
});

productVariantSchema.virtual("discountPercent").get(function() {
  if (!this.discountPrice) return 0;
  return Math.round((1 - this.discountPrice / this.price) * 100);
});

productVariantSchema.virtual("inStock").get(function() {
  return this.stock > 0;
});

productVariantSchema.virtual("availableStock").get(function() {
  return Math.max(0, this.stock - this.reservedStock);
});




/* ---------- DEFAULT VARIANT ENFORCE ---------- */

productVariantSchema.pre("save", async function () {
  if (this.isDefault) {
    await mongoose.models.ProductVariant.updateMany(
      { productId: this.productId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});




module.exports = mongoose.model("ProductVariant", productVariantSchema);