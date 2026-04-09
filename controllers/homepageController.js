const HomepageSection = require("../models/homepageSection");
const { buildHomepageSections } = require("../services/homepageSectionService");
const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");
const deleteFromCloudinary = require("../helpers/deleteFromCloudinaryHelper");

const {
  getHomepageCache,
  setHomepageCache,
  invalidateHomepageCache,
} = require("../services/homepageCacheService");

const { validateSectionSettings } = require("../utils/homepageSectionSettings");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const normalizeSectionDefinition = (type, settings = {}) => {
  if (type === "trending") {
    return {
      normalizedType: "product_grid",
      normalizedSettings: {
        ...(settings || {}),
        source: "trending",
      },
    };
  }

  return {
    normalizedType: type,
    normalizedSettings: settings || {},
  };
};

const getValidatedSettings = (type, settings = {}) => {
  try {
    return validateSectionSettings(type, settings);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
};

const parseSettingsInput = (settings) => {
  if (!settings) return {};

  if (typeof settings === "string") {
    try {
      return JSON.parse(settings);
    } catch {
      const err = new Error("Invalid JSON format in settings");
      err.statusCode = 400;
      throw err;
    }
  }

  return settings;
};

/* ===========================
   🔥 APPLY IMAGE UPLOAD FIXED
=========================== */
const applyUploadedBannerImages = async (
  type,
  settings,
  files = [],
  body = {}
) => {
  if (!Array.isArray(files) || files.length === 0) {
    return settings;
  }

  /* ========= HERO BANNER ========= */
  if (type === "hero_banner" && Array.isArray(settings.banners)) {
    let heroImageIndexes = [];

    try {
      heroImageIndexes = JSON.parse(body.heroImageIndexes || "[]");
    } catch {
      heroImageIndexes = [];
    }

    const heroFiles = files.filter((f) => f.fieldname === "heroImages");

    for (let i = 0; i < heroFiles.length; i++) {
      const file = heroFiles[i];
      const index = heroImageIndexes[i];

      if (index === undefined || !settings.banners[index]) continue;

      const oldImage = settings.banners[index]?.image;

      const uploaded = await uploadToCloudinary(file.buffer);

      // 🔥 NEW IMAGE SET
      settings.banners[index].image = uploaded.secure_url;

      // 🔥 OLD IMAGE DELETE
      if (oldImage && oldImage !== uploaded.secure_url) {
        await deleteFromCloudinary(oldImage);
      }
    }
  }

  /* ========= CAMPAIGN ========= */
  if (type === "campaign_banner" && Array.isArray(settings.campaigns)) {
    const campaignFile = files.find((f) => f.fieldname === "campaignImages");

    if (campaignFile && settings.campaigns[0]) {
      const oldImage = settings.campaigns[0]?.image;

      const uploaded = await uploadToCloudinary(campaignFile.buffer);

      settings.campaigns[0].image = uploaded.secure_url;

      // 🔥 DELETE OLD
      if (oldImage && oldImage !== uploaded.secure_url) {
        await deleteFromCloudinary(oldImage);
      }
    }
  }

  return settings;
};

/* ===========================
   CREATE
=========================== */
const createHomepageSection = asyncHandler(async (req, res) => {
  const { title, type, order, status } = req.body;
  const parsedSettings = parseSettingsInput(req.body.settings);

  if (!title || !type) {
    return res.status(400).json({
      success: false,
      message: "title and type are required",
    });
  }

  const { normalizedType, normalizedSettings } = normalizeSectionDefinition(
    type,
    parsedSettings
  );

  const settingsWithUploads = await applyUploadedBannerImages(
    normalizedType,
    normalizedSettings,
    req.files,
    req.body
  );

  const validatedSettings = getValidatedSettings(
    normalizedType,
    settingsWithUploads
  );

  const section = new HomepageSection({
    title,
    type: normalizedType,
    order,
    status,
    settings: validatedSettings,
  });

  await section.save();
  await invalidateHomepageCache();

  res.status(201).json({
    success: true,
    section,
  });
});

/* ===========================
   UPDATE (🔥 FULL FIXED)
=========================== */
const updateHomepageSection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const { title, type, order, status } = req.body;
  const { normalizedType: normalizedRequestedType } =
    normalizeSectionDefinition(type);

  const hasUploadFiles = Array.isArray(req.files) && req.files.length > 0;

  const parsedSettings =
    req.body.settings !== undefined
      ? parseSettingsInput(req.body.settings)
      : undefined;

  const section = await HomepageSection.findById(sectionId);

  if (!section) {
    return res.status(404).json({
      success: false,
      message: "Homepage section not found",
    });
  }

  if (section.type === "trending") {
    section.type = "product_grid";
    section.settings = {
      ...(section.settings || {}),
      source: "trending",
    };
  }

  if (title !== undefined) section.title = title;
  if (type !== undefined) section.type = normalizedRequestedType;
  if (order !== undefined) section.order = order;
  if (status !== undefined) section.status = status;

  const sectionType =
    type !== undefined ? normalizedRequestedType : section.type;

  if (parsedSettings !== undefined || hasUploadFiles) {
    const baseSettings =
      parsedSettings !== undefined
        ? { ...(section.settings || {}), ...parsedSettings }
        : JSON.parse(JSON.stringify(section.settings || {}));

    /* 🔥 BLOB FIX (VERY IMPORTANT) */
    if (sectionType === "hero_banner" && Array.isArray(baseSettings.banners)) {
      baseSettings.banners = baseSettings.banners.map((banner, index) => {
        if (banner.image?.startsWith("blob:")) {
          return {
            ...banner,
            image: section.settings?.banners?.[index]?.image || "",
          };
        }
        return banner;
      });
    }

    const { normalizedType, normalizedSettings } = normalizeSectionDefinition(
      sectionType,
      baseSettings
    );

    section.type = normalizedType;

    const settingsWithUploads = await applyUploadedBannerImages(
      normalizedType,
      normalizedSettings,
      req.files,
      req.body
    );

    section.settings = getValidatedSettings(
      normalizedType,
      settingsWithUploads
    );
  }

  await section.save();
  await invalidateHomepageCache();

  res.status(200).json({
    success: true,
    section,
  });
});

/* ===========================
   OTHERS (UNCHANGED)
=========================== */

const listHomepageSections = asyncHandler(async (req, res) => {
  const sections = await HomepageSection.find({})
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    sections,
  });
});

const getHomepageSectionById = asyncHandler(async (req, res) => {
  const section = await HomepageSection.findById(req.params.sectionId).lean();

  if (!section) {
    return res.status(404).json({
      success: false,
      message: "Homepage section not found",
    });
  }

  res.status(200).json({
    success: true,
    section,
  });
});

const deleteHomepageSection = asyncHandler(async (req, res) => {
  const deleted = await HomepageSection.findByIdAndDelete(req.params.sectionId);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Homepage section not found",
    });
  }

  await invalidateHomepageCache();

  res.status(200).json({
    success: true,
    message: "Homepage section deleted successfully",
  });
});

const reorderHomepageSections = asyncHandler(async (req, res) => {
  const { sectionOrders } = req.body;

  const bulkOperations = sectionOrders.map((item) => ({
    updateOne: {
      filter: { _id: item.sectionId },
      update: { $set: { order: item.order } },
    },
  }));

  await HomepageSection.bulkWrite(bulkOperations);
  await invalidateHomepageCache();

  const sections = await HomepageSection.find({})
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    sections,
  });
});

const getHomepage = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const guestId = req.headers["x-guest-id"] || null;
  const isPersonalizedRequest = Boolean(userId || guestId);

  if (!isPersonalizedRequest) {
    const cached = await getHomepageCache();

    if (cached) {
      return res.status(200).json({
        success: true,
        source: "cache",
        sections: cached,
      });
    }
  }

  const sections = await buildHomepageSections({ userId, guestId });

  if (!isPersonalizedRequest) {
    await setHomepageCache(sections);
  }

  res.status(200).json({
    success: true,
    source: isPersonalizedRequest ? "database_personalized" : "database",
    sections,
  });
});

module.exports = {
  listHomepageSections,
  getHomepageSectionById,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
  reorderHomepageSections,
  getHomepage,
  
};