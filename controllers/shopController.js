const mongoose = require("mongoose");
const Product = require("../models/product");

const getAllProducts = async (req, res, next) => {
  try {
    let {
      category,
      q,
      search,
      minPrice,
      maxPrice,
      sort,
      color,
      size,
      page = 1,
      limit = 12,
    } = req.query;

    page = Math.max(1, Number(page));
    limit = Math.max(1, Number(limit));

    const keyword = q || search;

    /* ---------- MATCH STAGE ---------- */
    const matchStage = {
      isActive: true,
      isPublished: true,
    };

    // Category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      matchStage.categoryId = new mongoose.Types.ObjectId(category);
    }

    // Search (text index if exists, otherwise regex)
    if (keyword) {
      matchStage.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { slug: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } },
      ];
    }

    /* ---------- PIPELINE ---------- */
    const pipeline = [
      { $match: matchStage },

      /* ---------- VARIANT LOOKUP ---------- */
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },

      // Remove products without variants
      {
        $match: {
          "variants.0": { $exists: true },
        },
      },

      /* ---------- VARIANT FILTERS ---------- */
      ...(color ? [{ $match: { "variants.color": color } }] : []),
      ...(size ? [{ $match: { "variants.size": size } }] : []),

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

      /* ---------- COMPUTED FIELDS ---------- */
      {
        $addFields: {
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

          totalStock: { $sum: "$variants.stock" },

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

          /* ---------- DEFAULT IMAGE LOGIC ---------- */
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
        },
      },

      /* ---------- SORTING ---------- */
      {
        $sort:
          sort === "price-low"
            ? { price: 1 }
            : sort === "price-high"
            ? { price: -1 }
            : sort === "name-asc"
            ? { name: 1 }
            : sort === "name-desc"
            ? { name: -1 }
            : { createdAt: -1 },
      },

      /* ---------- CLEAN DATA ---------- */
      {
        $project: {
          variants: 0,
        },
      },

      /* ---------- PAGINATION ---------- */
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const products = await Product.aggregate(pipeline);

    /* ---------- TOTAL COUNT ---------- */
    const totalPipeline = pipeline.filter(
      (stage) =>
        !stage.$skip &&
        !stage.$limit &&
        !stage.$sort &&
        !stage.$project
    );

    const totalResult = await Product.aggregate([
      ...totalPipeline,
      { $count: "count" },
    ]);

    const total = totalResult[0]?.count || 0;

    /* ---------- RESPONSE ---------- */
    res.status(200).json({
      success: true,
      query: keyword || null,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
};
