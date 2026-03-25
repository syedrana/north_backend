const mongoose = require("mongoose");
const FlashSale = require("../models/flashSale");

const Product = require("../models/product");
const { invalidateHomepageCache } = require("./homepageCacheService");

const DEFAULT_PRODUCT_POPULATION = {
  path: "products",
  select: "name slug categoryId isActive isPublished createdAt",
  populate: {
    path: "variants",
    select: "price discountPrice images isDefault isActive stock",
    match: { isActive: true },
    options: { sort: { isDefault: -1, createdAt: 1 } },
  },
};


const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeProduct = (product, sale) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const firstVariant = variants[0] || null;
  const basePrice = firstVariant?.price ?? null;
  const variantDiscountPrice = firstVariant?.discountPrice ?? null;

  let flashSalePrice = null;

  if (typeof basePrice === "number") {
    if (sale.discountType === "percentage") {
      flashSalePrice = Math.max(0, Number((basePrice - (basePrice * sale.discountValue) / 100).toFixed(2)));
    }

    if (sale.discountType === "fixed") {
      flashSalePrice = Math.max(0, Number((basePrice - sale.discountValue).toFixed(2)));
    }
  }

  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    image: firstVariant?.images?.[0]?.url ?? null,
    price: basePrice,
    discountPrice: variantDiscountPrice,
    flashSalePrice,
    stock: firstVariant?.stock ?? null,
  };
};

const enrichFlashSale = (sale, options = {}) => {
  if (!sale) return null;

  const now = options.now ? new Date(options.now) : new Date();
  const products = Array.isArray(sale.products) ? sale.products : [];
  const normalizedProducts = products.map((product) => normalizeProduct(product, sale));
  const startsInMs = Math.max(0, new Date(sale.startTime).getTime() - now.getTime());
  const endsInMs = Math.max(0, new Date(sale.endTime).getTime() - now.getTime());

  return {
    ...sale,
    productCount: normalizedProducts.length,
    products: normalizedProducts,
    timing: {
      isUpcoming: now < new Date(sale.startTime),
      isLive: now >= new Date(sale.startTime) && now <= new Date(sale.endTime) && sale.status === "active",
      hasEnded: now > new Date(sale.endTime),
      startsInMs,
      endsInMs,
    },
  };
};

const ensureObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`${fieldName} must be a valid MongoDB ObjectId`);
    error.statusCode = 400;
    throw error;
  }

  return new mongoose.Types.ObjectId(value);
};

const ensureProductsExist = async (productIds) => {
  const ids = [...new Set(productIds.map((id) => String(ensureObjectId(id, "products[]"))))];

  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
    isPublished: true,
  })
    .select("_id")
    .lean();

  if (products.length !== ids.length) {
    const found = new Set(products.map((product) => String(product._id)));
    const missing = ids.filter((id) => !found.has(String(id)));
    const error = new Error(`Some products are missing, inactive, or unpublished: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  return ids.map((id) => new mongoose.Types.ObjectId(id));
};

const validateFlashSaleInput = async (payload, { partial = false, existingSale = null } = {}) => {
  const data = { ...payload };

  const title = data.title !== undefined ? String(data.title).trim() : existingSale?.title;
  if (!partial || data.title !== undefined) {
    if (!title) {
      const error = new Error("title is required");
      error.statusCode = 400;
      throw error;
    }
  }

  const startTime = data.startTime !== undefined ? new Date(data.startTime) : existingSale?.startTime;
  const endTime = data.endTime !== undefined ? new Date(data.endTime) : existingSale?.endTime;

  if ((!partial || data.startTime !== undefined) && Number.isNaN(startTime?.getTime?.())) {
    const error = new Error("startTime must be a valid date");
    error.statusCode = 400;
    throw error;
  }

  if ((!partial || data.endTime !== undefined) && Number.isNaN(endTime?.getTime?.())) {
    const error = new Error("endTime must be a valid date");
    error.statusCode = 400;
    throw error;
  }

  if (startTime && endTime && startTime >= endTime) {
    const error = new Error("startTime must be earlier than endTime");
    error.statusCode = 400;
    throw error;
  }

  const discountType = data.discountType !== undefined ? String(data.discountType).trim() : existingSale?.discountType;
  if ((!partial || data.discountType !== undefined) && !["percentage", "fixed"].includes(discountType)) {
    const error = new Error("discountType must be one of: percentage, fixed");
    error.statusCode = 400;
    throw error;
  }

  const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : existingSale?.discountValue;
  if ((!partial || data.discountValue !== undefined) && (!Number.isFinite(discountValue) || discountValue < 0)) {
    const error = new Error("discountValue must be a positive number or zero");
    error.statusCode = 400;
    throw error;
  }

  if (discountType === "percentage" && discountValue > 100) {
    const error = new Error("Percentage discount cannot be greater than 100");
    error.statusCode = 400;
    throw error;
  }

  const status = data.status !== undefined ? String(data.status).trim() : existingSale?.status;
  if ((!partial || data.status !== undefined) && !["active", "inactive"].includes(status)) {
    const error = new Error("status must be one of: active, inactive");
    error.statusCode = 400;
    throw error;
  }

  let products = existingSale?.products || [];
  if (data.products !== undefined) {
    if (!Array.isArray(data.products) || data.products.length === 0) {
      const error = new Error("products must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }

    products = await ensureProductsExist(data.products);
  }

  return {
    title,
    startTime,
    endTime,
    products,
    discountType,
    discountValue,
    status,
  };
};

const assertNoOverlap = async ({ startTime, endTime, status, excludeId = null }) => {
  if (status !== "active") return;

  const query = {
    status: "active",
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const overlappingSale = await FlashSale.findOne(query).select("_id title startTime endTime").lean();

  if (overlappingSale) {
    const error = new Error(
      `Another active flash sale overlaps with the selected schedule: ${overlappingSale.title}`
    );
    error.statusCode = 409;
    throw error;
  }
};

const getFlashSaleBaseQuery = ({ status, search }) => {
  const query = {};

  if (["active", "inactive"].includes(status)) {
    query.status = status;
  }

  if (search) {
    query.title = { $regex: String(search).trim(), $options: "i" };
  }

  return query;
};

const listFlashSales = async ({ page = 1, limit = 10, status, search } = {}) => {
  const parsedPage = parsePositiveInteger(page, 1);
  const parsedLimit = parsePositiveInteger(limit, 10);
  const query = getFlashSaleBaseQuery({ status, search });

  const [sales, total] = await Promise.all([
    FlashSale.find(query)
      .sort({ startTime: -1, createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .populate(DEFAULT_PRODUCT_POPULATION)
      .lean(),
    FlashSale.countDocuments(query),
  ]);

  return {
    items: sales.map((sale) => enrichFlashSale(sale)),
    pagination: {
      total,
      totalPages: Math.ceil(total / parsedLimit),
      currentPage: parsedPage,
      pageSize: parsedLimit,
    },
  };
};

const getFlashSaleById = async (flashSaleId) => {
  const sale = await FlashSale.findById(ensureObjectId(flashSaleId, "flashSaleId"))
    .populate(DEFAULT_PRODUCT_POPULATION)
    .lean();

  return enrichFlashSale(sale);
};

const getActiveFlashSale = async (now = new Date()) => {
  const activeSale = await FlashSale.findOne({
    startTime: { $lte: now },
    endTime: { $gte: now },
    status: "active",
  })
    .sort({ startTime: 1, createdAt: 1 })
    .populate(DEFAULT_PRODUCT_POPULATION)
    .lean();

  return enrichFlashSale(activeSale, { now });
};

const createFlashSale = async (payload) => {
  const validated = await validateFlashSaleInput(payload);
  await assertNoOverlap(validated);

  const sale = await FlashSale.create(validated);
  await invalidateHomepageCache();
  return getFlashSaleById(sale._id);
};

const updateFlashSale = async (flashSaleId, payload) => {
  const existingSale = await FlashSale.findById(ensureObjectId(flashSaleId, "flashSaleId"));

  if (!existingSale) {
    const error = new Error("Flash sale not found");
    error.statusCode = 404;
    throw error;
  }

  const validated = await validateFlashSaleInput(payload, {
    partial: true,
    existingSale,
  });

  await assertNoOverlap({ ...validated, excludeId: existingSale._id });

  Object.assign(existingSale, validated);
  await existingSale.save();
  await invalidateHomepageCache();
  return getFlashSaleById(existingSale._id);
};

const deleteFlashSale = async (flashSaleId) => {
  const deleted = await FlashSale.findByIdAndDelete(ensureObjectId(flashSaleId, "flashSaleId"));

  if (!deleted) {
    const error = new Error("Flash sale not found");
    error.statusCode = 404;
    throw error;
  }

  await invalidateHomepageCache();
  return deleted;
};

module.exports = {
  listFlashSales,
  getFlashSaleById,
  getActiveFlashSale,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
};

