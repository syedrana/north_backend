const HomepageSection = require("../models/homepageSection");
const {
  resolveHeroBanner,
  resolveCategoryGrid,
  resolveProductGrid,
  resolveCampaignBanner,
  resolveFlashSale,
} = require("./homepageSectionResolvers");

const sectionResolvers = {
  hero_banner: resolveHeroBanner,
  category_grid: resolveCategoryGrid,
  product_grid: resolveProductGrid,
  trending: resolveProductGrid,
  campaign_banner: resolveCampaignBanner,
  flash_sale: resolveFlashSale,
};

const resolveSectionData = async (section) => {
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

  const data = await resolver(settings);

  return {
    ...section,
    data,
  };
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
