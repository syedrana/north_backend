const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const slugify = require("slugify");
const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");
const cloudinary = require("../config/cloudinary");


// @desc    Get all products with filtering, sorting & pagination
// @route   GET /api/products
// const getAllProducts = async (req, res, next) => {
//   try {
//     const { category, search, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

//     const query = { isActive: true };

//     // category filtering
//     if (category) query.categoryId = category;

//     // Search by name
//     if (search) query.name = { $regex: search, $options: "i" };

//     // Price range filtering
//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = Number(minPrice);
//       if (maxPrice) query.price.$lte = Number(maxPrice);
//     }

//     // Sorting logic
//     let sortBy = { createdAt: -1 };
//     if (sort === "price-low") sortBy = { price: 1 };
//     if (sort === "price-high") sortBy = { price: -1 };

//     const products = await Product.find(query)
//       .populate("categoryId", "name")
//       .skip((page - 1) * limit)
//       .limit(Number(limit))
//       .sort(sortBy);

//     const total = await Product.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       total,
//       totalPages: Math.ceil(total / limit),
//       currentPage: Number(page),
//       products,
//     });
//   } catch (error) {
//     next(error);
//   }
// };



/**
 * @desc    SHOP PAGE - Get all products (Daraz style)
 * @route   GET /api/products
 */
const getAllProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort,
      color,
      size,
      page = 1,
      limit = 12,
    } = req.query;

    const matchStage = { isActive: true, isPublished: true, };

    /* ---------- BASIC FILTERS ---------- */
    if (category) {
      matchStage.categoryId = new mongoose.Types.ObjectId(category);
    }

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    /* ---------- AGGREGATION ---------- */
    const pipeline = [
      { $match: matchStage },

      // 🔗 Join variants
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },

      // ❌ skip products without variants
      {
        $match: {
          "variants.0": { $exists: true },
        },
      },

      // 🎯 Variant based filters
      ...(color
        ? [{ $match: { "variants.color": color } }]
        : []),

      ...(size
        ? [{ $match: { "variants.size": size } }]
        : []),

      // 🧮 Price filter
      ...(minPrice || maxPrice
        ? [
            {
              $match: {
                "variants.price": {
                  ...(minPrice && { $gte: Number(minPrice) }),
                  ...(maxPrice && { $lte: Number(maxPrice) }),
                },
              },
            },
          ]
        : []),

      // 🧠 Computed fields (Daraz style)
      {
        $addFields: {
          /* -------- price & attributes -------- */
          price: { $min: "$variants.price" },
          discountPrice: {
            $min: {
              $cond: [
                { $gt: ["$variants.discountPrice", 0] },
                "$variants.discountPrice",
                "$variants.price",
              ],
            },
          },
          colors: { $setUnion: "$variants.color" },
          sizes: { $setUnion: "$variants.size" },

          /* -------- DEFAULT VARIANT IMAGE LOGIC -------- */
          mainImage: {
            $let: {
              vars: {
                defaultVariant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$variants",
                        as: "v",
                        cond: { $eq: ["$$v.isDefault", true] },
                      },
                    },
                    0,
                  ],
                },
                firstVariant: { $arrayElemAt: ["$variants", 0] },
              },
              in: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$$defaultVariant", null] },
                      { $gt: [{ $size: "$$defaultVariant.images" }, 0] },
                    ],
                  },
                  { $arrayElemAt: ["$$defaultVariant.images.url", 0] },
                  {
                    $cond: [
                      { $gt: [{ $size: "$$firstVariant.images" }, 0] },
                      { $arrayElemAt: ["$$firstVariant.images.url", 0] },
                      null,
                    ],
                  },
                ],
              },
            },
          },
          totalStock: {
            $sum: "$variants.stock",
          },

          stockStatus: {
            $cond: [
              { $eq: [{ $sum: "$variants.stock" }, 0] },
              "out",
              {
                $cond: [
                  { $lte: [{ $sum: "$variants.stock" }, 5] },
                  "low",
                  "in",
                ],
              },
            ],
          },
        },
      },


      // ↕ Sorting
      {
        $sort:
          sort === "price-low"
            ? { price: 1 }
            : sort === "price-high"
            ? { price: -1 }
            : { createdAt: -1 },
      },

      // 🧹 Clean heavy data
      {
        $project: {
          variants: 0,
        },
      },

      // 📄 Pagination
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
    ];

    const products = await Product.aggregate(pipeline);

    /* ---------- TOTAL COUNT ---------- */
    const totalPipeline = pipeline.filter(
      (stage) => !stage.$skip && !stage.$limit
    );

    const totalResult = await Product.aggregate([
      ...totalPipeline,
      { $count: "count" },
    ]);

    const total = totalResult[0]?.count || 0;

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
const getSingleProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
      isPublished: true,
    })
      .populate({
        path: "variants",
        options: { sort: { isDefault: -1 } },
      })
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};



const getAdminProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      status, // active | inactive
      page = 1,
      limit = 10,
    } = req.query;

    const matchStage = {};

    // status filter
    if (status === "active") matchStage.isActive = true;
    if (status === "inactive") matchStage.isActive = false;

    // category filter
    if (category) {
      matchStage.categoryId = new mongoose.Types.ObjectId(category);
    }

    // search filter
    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    const pipeline = [
      { $match: matchStage },

      // 🔗 Category join
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔗 Variant join
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },

      // 🧮 Variant count
      {
        $addFields: {
          variantsCount: { $size: "$variants" },
        },
      },

      // 🚦 Publish rule
      {
        $addFields: {
          canPublish: {
            $cond: [{ $gt: ["$variantsCount", 0] }, true, false],
          },
        },
      },

      // 🧹 Clean heavy fields
      {
        $project: {
          variants: 0,
        },
      },

      { $sort: { createdAt: -1 } },

      // 📄 Pagination
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
    ];

    const products = await Product.aggregate(pipeline);

    // total count (same filters, no pagination)
    const total = await Product.countDocuments(matchStage);

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

    const skuExists = await ProductVariant.findOne({ sku });
    if (skuExists) {
      return res.status(400).json({ success: false, message: "SKU must be unique" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer);
      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    const variant = await ProductVariant.create({
      productId: req.params.productId,
      sku,
      size,
      color,
      price,
      discountPrice,
      stock,
      images: uploadedImages,
      isDefault,
    });

    res.status(201).json({ success: true, variant });
  } catch (error) {
    next(error);
  }
};

const updateVariant = async (req, res, next) => {
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
      keepImages,
      removeImages,
    } = req.body;

    if (sku) variant.sku = sku;
    if (size) variant.size = size;
    if (color) variant.color = color;
    if (price !== undefined) variant.price = price;
    if (discountPrice !== undefined) variant.discountPrice = discountPrice;
    if (stock !== undefined) variant.stock = stock;
    if (images) variant.images = images;
    if (typeof isDefault === "boolean") variant.isDefault = isDefault;

      /* ---------------- IMAGE HANDLING ---------------- */

    // images to keep (existing)
    let finalImages = [];

    if (keepImages) {
      const keepIds = JSON.parse(keepImages);
      finalImages = variant.images.filter((img) =>
        keepIds.includes(img.public_id)
      );
    }

    // delete removed images from cloudinary
    if (removeImages) {
      const removed = JSON.parse(removeImages);
      for (const publicId of removed) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    // new uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);

        finalImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }


    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    variant.images = finalImages;

    await variant.save();

    res.json({
      success: true,
      message: "Variant updated successfully",
      variant,
    });
  } catch (error) {
    next(error);
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


const togglePublishProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    // count variants
    const variantsCount = await ProductVariant.countDocuments({
      productId,
    });

    if (variantsCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish product without variants",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isPublished = !product.isPublished;
    product.publishedAt = product.isPublished ? new Date() : null;

    await product.save();

    res.json({
      success: true,
      isPublished: product.isPublished,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// @desc    Admin - Get product with variants by productId
// @route   GET /products/admin/product/:id
// @access  Admin
const getAdminProductWithVariants = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await ProductVariant.find({ productId: product._id });

    res.status(200).json({
      success: true,
      product,
      variants,
    });
  } catch (error) {
    next(error);
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
  getAdminProductWithVariants,
  togglePublishProduct,
 };