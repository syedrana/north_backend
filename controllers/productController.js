const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const slugify = require("slugify");
const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");

// @desc    Get all products with filtering, sorting & pagination
// @route   GET /api/products
const getAllProducts = async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

    const query = { isActive: true };

    // category filtering
    if (category) query.categoryId = category;

    // Search by name
    if (search) query.name = { $regex: search, $options: "i" };

    // Price range filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting logic
    let sortBy = { createdAt: -1 };
    if (sort === "price-low") sortBy = { price: 1 };
    if (sort === "price-high") sortBy = { price: -1 };

    const products = await Product.find(query)
      .populate("categoryId", "name")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort(sortBy);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by slug with its variants
// @route   GET /api/products/:slug
const getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Fetch variants associated with this product
    const variants = await ProductVariant.find({ productId: product._id });

    res.status(200).json({ 
      success: true, 
      product, 
      variants 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin - Get all products (active + inactive)
// @route   GET /admin/products
// @access  Admin
const getAdminProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      status, // active | inactive
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // status filter
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    // search
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // category filter
    if (category) {
      query.categoryId = category;
    }

    const products = await Product.find(query)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      products,
    });
  } catch (error) {
    next(error);
  }
};


const createProduct = async (req, res, next) => {
  try {
    const { name, description, categoryId, brand, mainImage } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ success: false, message: "Name and Category are required" });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const exists = await Product.findOne({ slug });
    if (exists) {
      return res.status(409).json({ success: false, message: "Product name/slug already exists" });
    }

    const product = await Product.create({
      name,
      slug,
      description,
      categoryId,
      brand,
      mainImage
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, brand, isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (name) {
      product.name = name;
      product.slug = slugify(name, { lower: true, strict: true });
    }

    if (description) product.description = description;
    if (categoryId) product.categoryId = categoryId;
    if (brand) product.brand = brand;
    if (typeof isActive === "boolean") product.isActive = isActive;

    await product.save();

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await ProductVariant.deleteMany({ productId: id });

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product & all variants deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const createProductVariant = async (req, res, next) => {
  try {
    const { sku, size, color, price, discountPrice, stock, isDefault } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Variant image is required",
      });
    }

    // Check if SKU is unique
    const skuExists = await ProductVariant.findOne({ sku });
    if (skuExists) {
      return res.status(400).json({ success: false, message: "SKU must be unique" });
    }

    const imageResult = await uploadToCloudinary(req.file.buffer);

    const variant = await ProductVariant.create({
      productId: req.params.productId,
      sku,
      size,
      color,
      price,
      discountPrice,
      stock,
      images: [
        {
          url: imageResult.secure_url,
          public_id: imageResult.public_id,
        },
      ],
      isDefault,
    });

    res.status(201).json({ success: true, variant });
  } catch (error) {
    next(error);
  }
};

const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await ProductVariant.findById(id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

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

    if (sku) variant.sku = sku;
    if (size) variant.size = size;
    if (color) variant.color = color;
    if (price !== undefined) variant.price = price;
    if (discountPrice !== undefined) variant.discountPrice = discountPrice;
    if (stock !== undefined) variant.stock = stock;
    if (images) variant.images = images;
    if (typeof isDefault === "boolean") variant.isDefault = isDefault;

    await variant.save();

    res.json({
      success: true,
      message: "Variant updated successfully",
      variant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await ProductVariant.findById(id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    await variant.deleteOne();

    res.json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



module.exports = { 
  getAllProducts, 
  getSingleProduct, 
  getAdminProducts,
  createProduct, 
  updateProduct, 
  deleteProduct, 
  createProductVariant,
  updateVariant,
  deleteVariant,
 };