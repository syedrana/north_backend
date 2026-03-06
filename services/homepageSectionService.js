const mongoose = require("mongoose");
const HomepageSection = require("../models/homepageSection");
const Category = require("../models/category");
const Product = require("../models/product");

const SECTION_TYPES = {
  HERO_BANNER: "hero_banner",
  CATEGORY_GRID: "category_grid",
  PRODUCT_GRID: "product_grid",
  CAMPAIGN_BANNER: "campaign_banner",
};

const DEFAULT_PRODUCT_LIMIT = 8;
const DEFAULT_CATEGORY_LIMIT = 8;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const resolveHeroBannerSection = async (section) => {
  return {
    ...section,
    data: section.settings || {},
  };
};

const resolveCategoryGridSection = async (section) => {
  const settings = section.settings || {};
  const limit = parsePositiveInteger(settings.limit, DEFAULT_CATEGORY_LIMIT);

  const categories = await Category.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name slug parentId")
    .lean();

  return {
    ...section,
    data: {
      categories,
    },
  };
};

const buildProductMatchQuery = (settings = {}) => {
  const query = {
    isActive: true,
    isPublished: true,
  };

  if (
    settings.categoryId &&
    mongoose.Types.ObjectId.isValid(settings.categoryId)
  ) {
    query.categoryId = settings.categoryId;
  }

  return query;
};

const resolveProductGridSection = async (section) => {
  const settings = section.settings || {};
  const limit = parsePositiveInteger(settings.limit, DEFAULT_PRODUCT_LIMIT);

  const sort =
    settings.sortBy === "price_asc"
      ? { price: 1 }
      : settings.sortBy === "price_desc"
      ? { price: -1 }
      : { createdAt: -1 };

  const products = await Product.find(buildProductMatchQuery(settings))
    .sort(sort)
    .limit(limit)
    .select("name slug categoryId")
    .populate({
      path: "variants",
      select: "price discountPrice images isDefault isActive",
      match: { isActive: true },
      options: { sort: { isDefault: -1, createdAt: 1 } },
    })
    .lean();

  const normalizedProducts = products.map((product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const firstVariant = variants[0] || null;

    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      price: firstVariant?.price ?? null,
      discountPrice: firstVariant?.discountPrice ?? null,
      image: firstVariant?.images?.[0]?.url ?? null,
    };
  });

  return {
    ...section,
    data: {
      products: normalizedProducts,
    },
  };
};

const resolveCampaignBannerSection = async (section) => {
  return {
    ...section,
    data: section.settings || {},
  };
};

const sectionResolvers = {
  [SECTION_TYPES.HERO_BANNER]: resolveHeroBannerSection,
  [SECTION_TYPES.CATEGORY_GRID]: resolveCategoryGridSection,
  [SECTION_TYPES.PRODUCT_GRID]: resolveProductGridSection,
  [SECTION_TYPES.CAMPAIGN_BANNER]: resolveCampaignBannerSection,
};

const resolveSectionData = async (section) => {
  const resolver = sectionResolvers[section.type];

  if (!resolver) {
    return {
      ...section,
      data: null,
    };
  }

  return resolver(section);
};

const buildHomepageSections = async () => {
  const sections = await HomepageSection.find({ status: "active" })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const structuredSections = [];

  for (const section of sections) {
    const structuredSection = await resolveSectionData(section);
    structuredSections.push(structuredSection);
  }

  return structuredSections;
};

module.exports = {
  buildHomepageSections,
};
