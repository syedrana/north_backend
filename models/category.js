const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
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

// Auto slug + uniqueness
categorySchema.pre("validate", async function () {
  if (this.name && !this.slug) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 0;

    while (await mongoose.models.Category.findOne({ slug })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    this.slug = slug;
  }
});

// Prevent self parent + inactive parent
categorySchema.pre("save", async function () {
  if (this.parentId) {
    if (this.parentId.equals(this._id)) {
      throw new Error("Category cannot be its own parent");
    }

    const parent = await mongoose
      .model("Category")
      .findById(this.parentId);

    if (!parent || !parent.isActive) {
      throw new Error("Parent category does not exist or is inactive");
    }
  }
});

categorySchema.index({ parentId: 1, isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);
