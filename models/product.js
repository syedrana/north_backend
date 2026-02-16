const mongoose = require("mongoose");
const slugify = require("slugify");

const sizeChartRowSchema = new mongoose.Schema({
  size: String,
  chest: String,
  waist: String,
  length: String,
  shoulder: String,
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      minlength: [10, "Description must be at least 10 characters"],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "No Brand",
    },
    // attributes: {
    //   fabric: { type: String, trim: true },
    //   fit: { type: String, trim: true },
    //   gender: { type: String, trim: true },
    // },
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    sizeChart: [sizeChartRowSchema],
    sizeOptions: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],
    tags: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    publishedAt: {
      type: Date,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
  tags: "text",
  slug: "text",
});


productSchema.pre("validate", async function () {
  if (!this.name) return;

  if (!this.slug) {
    const base = slugify(this.name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;

    const Product = mongoose.models.Product || mongoose.model("Product");


    while (await Product.exists({ slug })) {
      slug = `${base}-${counter++}`;
    }

    this.slug = slug;
  }
});

productSchema.pre("save", async function () {
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

productSchema.virtual("variants", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
});

module.exports = mongoose.model("Product", productSchema);