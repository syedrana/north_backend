const Category = require("../models/category");
const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");
const deleteFromCloudinary = require("../helpers/deleteFromCloudinaryHelper");

exports.createCategory = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category name '${name}' already exists`,
      });
    }

    let parent = null;
    if (parentId) {
      parent = await Category.findById(parentId);

      if (!parent || !parent.isActive) {
        return res.status(400).json({
          success: false,
          message: "Parent category does not exist or is inactive",
        });
      }

      if (parent.name.trim().toLowerCase() === name.trim().toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be same as parent category",
        });
      }
    }

    let imageData = {};

    if (req.file?.buffer) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageData = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const category = await Category.create({
      name,
      parentId: parentId || null,
      image: imageData,
    });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /categorys?search=elec
exports.getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {
      isActive: true,
      ...(search && {
        name: { $regex: search, $options: "i" },
      }),
    };

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .limit(20);

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSingleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter((cat) => String(cat.parentId) === String(parentId))
    .map((cat) => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      children: buildCategoryTree(categories, cat._id),
    }));
};

exports.getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });

    const tree = buildCategoryTree(categories);

    res.json({
      success: true,
      categories: tree,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, parentId, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name) category.name = name;
    if (parentId !== undefined) category.parentId = parentId;
    if (isActive !== undefined) category.isActive = isActive;

    if (req.file?.buffer) {
      const oldImage = category.image;
      const uploaded = await uploadToCloudinary(req.file.buffer);
      category.image = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };

      if (oldImage?.publicId) {
        await deleteFromCloudinary(oldImage.publicId);
      }
    }

    await category.save();

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: "Category deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
