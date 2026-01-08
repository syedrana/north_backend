// const Product = require("../models/Product");
// const ProductVariant = require("../models/ProductVariant");

// exports.getAllProducts = async (req, res) => {
//   try {
//     const { category, search, page = 1, limit = 12 } = req.query;

//     const query = { isActive: true };

//     if (category) query.categoryId = category;
//     if (search)
//       query.name = { $regex: search, $options: "i" };

//     const products = await Product.find(query)
//       .skip((page - 1) * limit)
//       .limit(Number(limit))
//       .sort({ createdAt: -1 });

//     const total = await Product.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       total,
//       page: Number(page),
//       products,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getSingleProduct = async (req, res) => {
//   try {
//     const product = await Product.findOne({
//       slug: req.params.slug,
//       isActive: true,
//     }).populate("categoryId", "name");

//     if (!product)
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });

//     res.status(200).json({ success: true, product });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getProductVariants = async (req, res) => {
//   try {
//     const variants = await ProductVariant.find({
//       productId: req.params.productId,
//     }).sort({ price: 1 });

//     res.status(200).json({
//       success: true,
//       variants,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.createProduct = async (req, res) => {
//   try {
//     const { name, slug, description, categoryId, brand } = req.body;

//     if (!name || !slug || !categoryId)
//       return res.status(400).json({
//         success: false,
//         message: "Required fields missing",
//       });

//     const exists = await Product.findOne({ slug });
//     if (exists)
//       return res.status(409).json({
//         success: false,
//         message: "Product slug already exists",
//       });

//     const product = await Product.create({
//       name,
//       slug,
//       description,
//       categoryId,
//       brand,
//     });

//     res.status(201).json({
//       success: true,
//       product,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.createProductVariant = async (req, res) => {
//   try {
//     const {
//       sku,
//       size,
//       color,
//       price,
//       discountPrice,
//       stock,
//       images,
//       isDefault,
//     } = req.body;

//     if (!sku || !size || !color || !price || !stock || !images)
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });

//     const variant = await ProductVariant.create({
//       productId: req.params.productId,
//       sku,
//       size,
//       color,
//       price,
//       discountPrice,
//       stock,
//       images,
//       isDefault,
//     });

//     res.status(201).json({
//       success: true,
//       variant,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };



const Product = require("../../models/product");
const ProductVariant = require("../../models/productVariant");
const slugify = require("slugify");
const uploadToCloudinary = require("../../helpers/uploadToCloudinaryHelper");

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

// @desc    Create new product (Admin Only)
// @route   POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { name, description, categoryId, brand, mainImage } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ success: false, message: "Name and Category are required" });
    }

    // Auto-generate slug from name
    const slug = slugify(name, { lower: true, strict: true });

    // Check if slug already exists
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
    //res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add variants to existing product (Admin Only)
// @route   POST /api/products/:productId/variants
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


module.exports = { getAllProducts, getSingleProduct, createProduct, createProductVariant };