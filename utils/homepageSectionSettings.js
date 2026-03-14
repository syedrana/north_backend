const SUPPORTED_SECTION_TYPES = [
  "hero_banner",
  "category_grid",
  "product_grid",
  "campaign_banner",
];

const PRODUCT_GRID_SOURCES = [
  "manual",
  "trending",
  "best_seller",
  "new_arrival",
  "category",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureObject(value, fieldName) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${fieldName} must be an object`);
  return value;
}

function ensureNumber(value, fieldName) {
  const parsed = Number(value);
  assert(Number.isFinite(parsed), `${fieldName} must be a number`);
  return parsed;
}

function ensureString(value, fieldName) {
  assert(typeof value === "string" && value.trim().length > 0, `${fieldName} must be a non-empty string`);
  return value.trim();
}

function ensureOptionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return "";
  }

  assert(typeof value === "string", `${fieldName} must be a string`);
  return value.trim();
}

function validateHeroBannerSettings(settings) {
  const input = ensureObject(settings, "settings");
  assert(Array.isArray(input.banners), "settings.banners must be an array");

  const banners = input.banners.map((banner, index) => {
    const current = ensureObject(banner, `settings.banners[${index}]`);

    return {
      image: ensureOptionalString(current.image, `settings.banners[${index}].image`),
      title: ensureOptionalString(current.title, `settings.banners[${index}].title`),
      subtitle: ensureOptionalString(current.subtitle, `settings.banners[${index}].subtitle`),
      buttonText: ensureOptionalString(current.buttonText, `settings.banners[${index}].buttonText`),
      link: ensureOptionalString(current.link, `settings.banners[${index}].link`),
    };
  });

  return { banners };
}

function validateCategoryGridSettings(settings) {
  const input = ensureObject(settings, "settings");

  return {
    limit: ensureNumber(input.limit, "settings.limit"),
  };
}

function validateProductGridSettings(settings) {
  const input = ensureObject(settings, "settings");
  const source = ensureString(input.source, "settings.source");

  assert(PRODUCT_GRID_SOURCES.includes(source), `settings.source must be one of: ${PRODUCT_GRID_SOURCES.join(", ")}`);

  const validated = {
    source,
    limit: ensureNumber(input.limit, "settings.limit"),
  };

  if (input.productIds !== undefined) {
    assert(Array.isArray(input.productIds), "settings.productIds must be an array");
    validated.productIds = input.productIds;
  }

  if (input.categoryId !== undefined && input.categoryId !== null) {
    validated.categoryId = input.categoryId;
  }

  return validated;
}

function validateCampaignBannerSettings(settings) {
  const input = ensureObject(settings, "settings");
  assert(Array.isArray(input.campaigns), "settings.campaigns must be an array");

  return {
    campaigns: input.campaigns.map((campaign, index) => {
      const current = ensureObject(campaign, `settings.campaigns[${index}]`);

      return {
        image: ensureOptionalString(current.image, `settings.campaigns[${index}].image`),
        link: ensureOptionalString(current.link, `settings.campaigns[${index}].link`),
      };
    }),
  };
}

function validateSectionSettings(type, settings = {}) {
  const sectionType = ensureString(type, "type");
  assert(
    SUPPORTED_SECTION_TYPES.includes(sectionType),
    `Unsupported section type: ${sectionType}`
  );

  switch (sectionType) {
    case "hero_banner":
      return validateHeroBannerSettings(settings);
    case "category_grid":
      return validateCategoryGridSettings(settings);
    case "product_grid":
      return validateProductGridSettings(settings);
    case "campaign_banner":
      return validateCampaignBannerSettings(settings);
    default:
      throw new Error(`Unsupported section type: ${sectionType}`);
  }
}

module.exports = {
  validateSectionSettings,
};
