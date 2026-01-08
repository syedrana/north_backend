const Category = require("../../models/category");

exports.createCategory = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await Category.create({
      name,
      parentId: parentId || null,
    });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ createdAt: 1 });

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
    .filter(cat =>
      String(cat.parentId) === String(parentId)
    )
    .map(cat => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
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
