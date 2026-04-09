const HomepageSection = require("../models/homepageSection");
const {
  resolveHeroBanner,
  resolveCategoryGrid,
  resolveProductGrid,
  resolveCampaignBanner,
  resolveFlashSale,
  resolveRecentlyViewed,
} = require("./homepageSectionResolvers");

const sectionResolvers = {
  hero_banner: resolveHeroBanner,
  category_grid: resolveCategoryGrid,
  product_grid: resolveProductGrid,
  trending: resolveProductGrid,
  campaign_banner: resolveCampaignBanner,
  flash_sale: resolveFlashSale,
  recently_viewed: resolveRecentlyViewed,
};

const resolveSectionData = async (section,  context = {}) => {
  const resolver = sectionResolvers[section.type];
  const settings =
    section.type === "trending"
      ? { ...(section.settings || {}), source: "trending" }
      : section.settings || {};

  if (!resolver) {
    return {
      ...section,
      data: null,
    };
  }

  const data = await resolver(settings, context);

  return {
    ...section,
    data,
  };
};

const buildHomepageSections = async (context = {}) => {
  const sections = await HomepageSection.find({ status: "active" })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const structuredSections = [];

  for (const section of sections) {
    const structuredSection = await resolveSectionData(section, context);
    structuredSections.push(structuredSection);
  }

  return structuredSections;
};

module.exports = {
  buildHomepageSections,
};
