const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;

    const query = { isActive: true };

    if (category) query.categoryId = category;
    if (search)
      query.name = { $regex: search, $options: "i" };

    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("categoryId", "name");

    if (!product)
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductVariants = async (req, res) => {
  try {
    const variants = await ProductVariant.find({
      productId: req.params.productId,
    }).sort({ price: 1 });

    res.status(200).json({
      success: true,
      variants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, slug, description, categoryId, brand } = req.body;

    if (!name || !slug || !categoryId)
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });

    const exists = await Product.findOne({ slug });
    if (exists)
      return res.status(409).json({
        success: false,
        message: "Product slug already exists",
      });

    const product = await Product.create({
      name,
      slug,
      description,
      categoryId,
      brand,
    });

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProductVariant = async (req, res) => {
  try {
    const {
      sku,
      size,
      color,
      price,
      discountPrice,
      stock,
      images,
      isDefault,
    } = req.body;

    if (!sku || !size || !color || !price || !stock || !images)
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });

    const variant = await ProductVariant.create({
      productId: req.params.productId,
      sku,
      size,
      color,
      price,
      discountPrice,
      stock,
      images,
      isDefault,
    });

    res.status(201).json({
      success: true,
      variant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

