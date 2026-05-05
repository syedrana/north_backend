// const Category = require("../models/category");
// const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");
// const deleteFromCloudinary = require("../helpers/deleteFromCloudinaryHelper");

// const normalizeCategory = (categoryDoc) => {
//   const category = categoryDoc?.toObject ? categoryDoc.toObject() : categoryDoc;
//   const imageUrl =
//     typeof category?.image === "string"
//       ? category.image
//       : category?.image?.url ||
//         category?.image?.secure_url ||
//         category?.image?.path ||
//         category?.image?.src ||
//         category?.imageUrl ||
//         "";

//   return {
//     ...category,
//     image: {
//       url: imageUrl,
//       publicId: category?.image?.publicId || "",
//     },
//     imageUrl,
//   };
// };

// exports.createCategory = async (req, res) => {
//   try {
//     const { name, parentId } = req.body;

//     if (!name) {
//       return res.status(400).json({
//         success: false,
//         message: "Category name is required",
//       });
//     }

//     const existing = await Category.findOne({ name: name.trim() });
//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: `Category name '${name}' already exists`,
//       });
//     }

//     let parent = null;
//     if (parentId) {
//       parent = await Category.findById(parentId);

//       if (!parent || !parent.isActive) {
//         return res.status(400).json({
//           success: false,
//           message: "Parent category does not exist or is inactive",
//         });
//       }

//       if (parent.name.trim().toLowerCase() === name.trim().toLowerCase()) {
//         return res.status(400).json({
//           success: false,
//           message: "Category name cannot be same as parent category",
//         });
//       }
//     }

//     let imageData = {};

//     if (req.file?.buffer) {
//       const result = await uploadToCloudinary(req.file.buffer);
//       imageData = {
//         url: result.secure_url,
//         publicId: result.public_id,
//       };
//     }

//     const category = await Category.create({
//       name,
//       parentId: parentId || null,
//       image: imageData,
//     });

//     res.status(201).json({
//       success: true,
//       category: normalizeCategory(category),
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // GET /categorys?search=elec
// exports.getAllCategories = async (req, res) => {
//   try {
//     const { search } = req.query;

//     const filter = {
//       isActive: true,
//       ...(search && {
//         name: { $regex: search, $options: "i" },
//       }),
//     };

//     const categories = await Category.find(filter)
//       .sort({ name: 1 })
//       .limit(20);

//     res.json({
//       success: true,
//       categories: categories.map(normalizeCategory),
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getSingleCategory = async (req, res) => {
//   try {
//     const category = await Category.findById(req.params.id);

//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: "Category not found",
//       });
//     }

//     res.json({ success: true, category: normalizeCategory(category) });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const buildCategoryTree = (categories, parentId = null) => {
//   return categories
//     .filter((cat) => String(cat.parentId) === String(parentId))
//     .map((cat) => ({
//       _id: cat._id,
//       name: cat.name,
//       slug: cat.slug,
//       image: {
//         url:
//           typeof cat?.image === "string"
//             ? cat.image
//             : cat?.image?.url ||
//               cat?.image?.secure_url ||
//               cat?.image?.path ||
//               cat?.image?.src ||
//               cat?.imageUrl ||
//               "",
//         publicId: cat?.image?.publicId || "",
//       },
//       imageUrl:
//         typeof cat?.image === "string"
//           ? cat.image
//           : cat?.image?.url ||
//             cat?.image?.secure_url ||
//             cat?.image?.path ||
//             cat?.image?.src ||
//             cat?.imageUrl ||
//             "",
//       children: buildCategoryTree(categories, cat._id),
//     }));
// };

// exports.getCategoryTree = async (req, res) => {
//   try {
//     const categories = await Category.find({ isActive: true });

//     const tree = buildCategoryTree(categories);

//     res.json({
//       success: true,
//       categories: tree,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.updateCategory = async (req, res) => {
//   try {
//     const { name, parentId, isActive } = req.body;

//     const category = await Category.findById(req.params.id);

//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: "Category not found",
//       });
//     }

//     if (name) category.name = name;
//     if (parentId !== undefined) category.parentId = parentId;
//     if (isActive !== undefined) category.isActive = isActive;

//     if (req.file?.buffer) {
//       const oldImage = category.image;
//       const uploaded = await uploadToCloudinary(req.file.buffer);
//       category.image = {
//         url: uploaded.secure_url,
//         publicId: uploaded.public_id,
//       };

//       if (oldImage?.publicId) {
//         await deleteFromCloudinary(oldImage.publicId);
//       }
//     }

//     await category.save();

//     res.json({ success: true, category: normalizeCategory(category) });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.deleteCategory = async (req, res) => {
//   try {
//     const category = await Category.findById(req.params.id);

//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: "Category not found",
//       });
//     }

//     category.isActive = false;
//     await category.save();

//     res.json({
//       success: true,
//       message: "Category deactivated successfully",
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };



























const mongoose = require("mongoose");
const Category = require("../models/category");
const Product = require("../models/Product");
const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");
const deleteFromCloudinary = require("../helpers/deleteFromCloudinaryHelper");

// =======================
// NORMALIZE
// =======================
const normalizeCategory = (cat) => {
  const c = cat.toObject ? cat.toObject() : cat;

  return {
    ...c,
    image: {
      url: c?.image?.url || "",
      publicId: c?.image?.publicId || "",
    },
    imageUrl: c?.image?.url || "",
  };
};

// =======================
// UPDATE CHILDREN (CRITICAL)
// =======================
const updateChildren = async (parent) => {
  const children = await Category.find({ parentId: parent._id });

  for (let child of children) {
    child.ancestors = [
      ...parent.ancestors,
      {
        _id: parent._id,
        name: parent.name,
        slug: parent.slug,
      },
    ];

    child.level = parent.level + 1;

    await child.save();
    await updateChildren(child);
  }
};

// =======================
// CREATE
// =======================
exports.createCategory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, parentId } = req.body;

    const existing = await Category.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existing) throw new Error("Category already exists");

    let imageData = {};

    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageData = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    const [category] = await Category.create(
      [
        {
          name: name.trim(),
          parentId: parentId || null,
          image: imageData,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      category: normalizeCategory(category),
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// =======================
// GET ALL
// =======================
exports.getAllCategories = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const filter = {
      isActive: true,
      ...(search && {
        $text: { $search: search },
      }),
    };

    const categories = await Category.find(filter)
      .sort({ order: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Category.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      categories: categories.map(normalizeCategory),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// UPDATE
// =======================
exports.updateCategory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, parentId, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) throw new Error("Category not found");

    // duplicate
    if (name) {
      const existing = await Category.findOne({
        _id: { $ne: category._id },
        name: { $regex: `^${name.trim()}$`, $options: "i" },
      });

      if (existing) throw new Error("Category name exists");

      category.name = name.trim();
    }

    const parentChanged =
      parentId !== undefined &&
      String(parentId || null) !== String(category.parentId || null);

    if (parentChanged) {
      category.parentId = parentId || null;
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    let oldImageId = null;

    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer);

      oldImageId = category.image?.publicId;

      category.image = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    await category.save({ session });

    // 🔥 update children tree
    if (parentChanged) {
      await updateChildren(category);
    }

    await session.commitTransaction();

    // ✅ delete old image AFTER commit
    if (oldImageId) {
      await deleteFromCloudinary(oldImageId);
    }

    res.json({
      success: true,
      category: normalizeCategory(category),
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// =======================
// DELETE (BULK)
// =======================
exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    await Category.updateMany(
      {
        $or: [{ _id: id }, { "ancestors._id": id }],
      },
      { isActive: false }
    );

    res.json({
      success: true,
      message: "Category tree deactivated",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// SINGLE
// =======================
exports.getSingleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();

    if (!category) throw new Error("Not found");

    res.json({
      success: true,
      category: normalizeCategory(category),
    });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// =======================
// TREE
// =======================
exports.getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    const map = {};
    const roots = [];

    categories.forEach((c) => {
      map[c._id] = { ...c, children: [] };
    });

    categories.forEach((c) => {
      if (c.parentId) {
        map[c.parentId]?.children.push(map[c._id]);
      } else {
        roots.push(map[c._id]);
      }
    });

    res.json({ success: true, categories: roots });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// =======================
// REORDER
// =======================
exports.reorderCategories = async (req, res) => {
  try {
    const bulk = req.body.items.map((i) => ({
      updateOne: {
        filter: { _id: i.id },
        update: { order: i.order },
      },
    }));

    await Category.bulkWrite(bulk);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// =======================
// ANALYTICS
// =======================
exports.trackCategoryUsage = async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, {
      $inc: { usageCount: 1 },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};

// =======================
// PRODUCT COUNT (WITH CHILDREN)
// =======================
exports.getCategoryWithCounts = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).lean();

    const products = await Product.find().select("category").lean();

    const countMap = {};

    products.forEach((p) => {
      countMap[p.category] = (countMap[p.category] || 0) + 1;
    });

    // include children
    const getTotal = (catId) => {
      let total = countMap[catId] || 0;

      categories
        .filter((c) => String(c.parentId) === String(catId))
        .forEach((child) => {
          total += getTotal(child._id);
        });

      return total;
    };

    const result = categories.map((c) => ({
      ...c,
      productCount: getTotal(c._id),
    }));

    res.json({ success: true, categories: result });
  } catch {
    res.status(500).json({ success: false });
  }
};