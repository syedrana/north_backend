// const mongoose = require("mongoose");
// const slugify = require("slugify");

// const categorySchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       unique: true,
//       minlength: [2, "Category name must be at least 2 characters"],
//       maxlength: [50, "Category name cannot exceed 50 characters"],
//     },
//     slug: {
//       type: String,
//       unique: true,
//       lowercase: true,
//       index: true,
//     },
//     parentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       default: null,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     image: {
//       url: {
//         type: String,
//         default: "",
//       },
//       publicId: {
//         type: String,
//         default: "",
//       },
//     },
//   },
//   { timestamps: true }
// );

// // Auto slug + uniqueness
// categorySchema.pre("validate", async function () {
//   if (this.name && !this.slug) {
//     let baseSlug = slugify(this.name, { lower: true, strict: true });
//     let slug = baseSlug;
//     let count = 0;

//     while (await mongoose.models.Category.findOne({ slug })) {
//       count++;
//       slug = `${baseSlug}-${count}`;
//     }

//     this.slug = slug;
//   }
// });

// // Prevent self parent + inactive parent
// categorySchema.pre("save", async function () {
//   if (this.parentId) {
//     if (this.parentId.equals(this._id)) {
//       throw new Error("Category cannot be its own parent");
//     }

//     const parent = await mongoose
//       .model("Category")
//       .findById(this.parentId);

//     if (!parent || !parent.isActive) {
//       throw new Error("Parent category does not exist or is inactive");
//     }
//   }
// });

// categorySchema.index({ parentId: 1, isActive: 1 });

// module.exports = mongoose.model("Category", categorySchema);












// const mongoose = require("mongoose");
// const slugify = require("slugify");

// const categorySchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 2,
//       maxlength: 50,
//     },

//     slug: {
//       type: String,
//       lowercase: true,
//       unique: true,
//       index: true,
//     },

//     parentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       default: null,
//       index: true,
//     },

//     ancestors: [
//       {
//         _id: mongoose.Schema.Types.ObjectId,
//         name: String,
//         slug: String,
//       },
//     ],

//     level: {
//       type: Number,
//       default: 0,
//       index: true,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//       index: true,
//     },

//     image: {
//       url: String,
//       publicId: String,
//     },
//   },
//   { timestamps: true }
// );

// // 🔥 Compound indexes
// categorySchema.index({ name: 1, isActive: 1 });
// categorySchema.index({ parentId: 1, isActive: 1 });

// // 🔥 Pre Save
// categorySchema.pre("save", async function (next) {
//   try {
//     // ✅ Slug unique
//     if (this.isModified("name")) {
//       let baseSlug = slugify(this.name, { lower: true, strict: true });
//       let slug = baseSlug;
//       let count = 1;

//       while (await mongoose.models.Category.findOne({ slug })) {
//         slug = `${baseSlug}-${count++}`;
//       }

//       this.slug = slug;
//     }

//     // ✅ Parent logic
//     if (this.parentId) {
//       if (this.parentId.equals(this._id)) {
//         throw new Error("Category cannot be its own parent");
//       }

//       const parent = await mongoose.models.Category.findById(this.parentId);

//       if (!parent || !parent.isActive) {
//         throw new Error("Invalid parent");
//       }

//       // 🚀 Ancestors (no recursion)
//       this.ancestors = [
//         ...parent.ancestors,
//         {
//           _id: parent._id,
//           name: parent.name,
//           slug: parent.slug,
//         },
//       ];

//       this.level = parent.level + 1;
//     } else {
//       this.ancestors = [];
//       this.level = 0;
//     }

//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = mongoose.model("Category", categorySchema);






























const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    slug: {
      type: String,
      lowercase: true,
      unique: true,
      index: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    ancestors: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        slug: String,
      },
    ],

    level: {
      type: Number,
      default: 0,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    usageCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    image: {
      url: String,
      publicId: String,
    },
  },
  { timestamps: true }
);

categorySchema.index({ parentId: 1, order: 1 });
categorySchema.index({ name: "text" });

// 🔥 Pre Save
categorySchema.pre("save", async function () {
  try {
    if (this.isModified("name")) {
      let baseSlug = slugify(this.name, { lower: true, strict: true });
      this.slug = `${baseSlug}-${Date.now()}`; // race safe
    }

    if (this.parentId) {
      const parent = await mongoose.models.Category.findById(this.parentId);

      if (!parent) throw new Error("Invalid parent");

      this.ancestors = [
        ...parent.ancestors,
        {
          _id: parent._id,
          name: parent.name,
          slug: parent.slug,
        },
      ];

      this.level = parent.level + 1;
    } else {
      this.ancestors = [];
      this.level = 0;
    }

    // next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Category", categorySchema);