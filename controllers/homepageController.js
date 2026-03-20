// const HomepageSection = require("../models/homepageSection");
// const { buildHomepageSections } = require("../services/homepageSectionService");
// const uploadToCloudinary = require("../helpers/uploadToCloudinaryHelper");

// const {
//   getHomepageCache,
//   setHomepageCache,
//   invalidateHomepageCache,
// } = require("../services/homepageCacheService");

// const { validateSectionSettings } = require("../utils/homepageSectionSettings");

// const asyncHandler = (handler) => (req, res, next) => {
//   Promise.resolve(handler(req, res, next)).catch(next);
// };

// const getValidatedSettings = (type, settings = {}) => {
//   try {
//     return validateSectionSettings(type, settings);
//   } catch (error) {
//     error.statusCode = 400;
//     throw error;
//   }
// };

// const parseSettingsInput = (settings) => {
//   if (settings === undefined || settings === null || settings === "") {
//     return {};
//   }

//   if (typeof settings === "string") {
//     try {
//       return JSON.parse(settings);
//     } catch (error) {
//       const parsingError = new Error("Invalid JSON format in settings");
//       parsingError.statusCode = 400;
//       throw parsingError;
//     }
//   }

//   return settings;
// };

// const collectUploadsByIndex = (files = [], fieldName) => {
//   const uploadsByIndex = new Map();

//   for (const file of files) {
//     const match = file.fieldname.match(fieldName);

//     if (!match) {
//       continue;
//     }

//     const index = Number(match[1]);

//     if (!Number.isInteger(index) || index < 0) {
//       continue;
//     }

//     uploadsByIndex.set(index, file);
//   }

//   return uploadsByIndex;
// };

// const applyUploadedBannerImages = async (type, settings, files = []) => {
//   if (!Array.isArray(files) || files.length === 0) {
//     return settings;
//   }

//   if (type === "hero_banner" && Array.isArray(settings.banners)) {
//     const uploadsByIndex = collectUploadsByIndex(
//       files,
//       /^banners\[(\d+)\]\[image\]$/
//     );

//     const fallbackHeroImages = files.filter((file) => file.fieldname === "heroImages");

//     for (let index = 0; index < settings.banners.length; index += 1) {
//       const banner = settings.banners[index];
//       const file = uploadsByIndex.get(index) || fallbackHeroImages[index];

//       if (!file) {
//         continue;
//       }

//       const uploaded = await uploadToCloudinary(file.buffer);
//       banner.image = uploaded.secure_url;
//     }
//   }

//   if (type === "campaign_banner" && Array.isArray(settings.campaigns)) {
//     const uploadsByIndex = collectUploadsByIndex(
//       files,
//       /^campaigns\[(\d+)\]\[image\]$/
//     );

//     const fallbackCampaignImages = files.filter(
//       (file) => file.fieldname === "campaignImages"
//     );

//     for (let index = 0; index < settings.campaigns.length; index += 1) {
//       const campaign = settings.campaigns[index];
//       const file = uploadsByIndex.get(index) || fallbackCampaignImages[index];

//       if (!file) {
//         continue;
//       }

//       const uploaded = await uploadToCloudinary(file.buffer);
//       campaign.image = uploaded.secure_url;
//     }
//   }

//   return settings;
// };

// const createHomepageSection = asyncHandler(async (req, res) => {
//   const { title, type, order, status } = req.body;
//   const parsedSettings = parseSettingsInput(req.body.settings);

//   if (!title || !type) {
//     return res.status(400).json({
//       success: false,
//       message: "title and type are required",
//     });
//   }

//   const settingsWithUploads = await applyUploadedBannerImages(
//     type,
//     parsedSettings,
//     req.files
//   );

//   const validatedSettings = getValidatedSettings(type, settingsWithUploads || {});

//   const section = new HomepageSection({
//     title,
//     type,
//     order,
//     status,
//     settings: validatedSettings,
//   });

//   await section.save();
//   await invalidateHomepageCache();

//   res.status(201).json({
//     success: true,
//     section,
//   });
// });

// const listHomepageSections = asyncHandler(async (req, res) => {
//   const sections = await HomepageSection.find({})
//     .sort({ order: 1, createdAt: 1 })
//     .lean();

//   res.status(200).json({
//     success: true,
//     sections,
//   });
// });

// const getHomepageSectionById = asyncHandler(async (req, res) => {
//   const { sectionId } = req.params;
//   const section = await HomepageSection.findById(sectionId).lean();

//   if (!section) {
//     return res.status(404).json({
//       success: false,
//       message: "Homepage section not found",
//     });
//   }

//   res.status(200).json({
//     success: true,
//     section,
//   });
// });

// const updateHomepageSection = asyncHandler(async (req, res) => {
//   const { sectionId } = req.params;
//   const { title, type, order, status } = req.body;
//   const hasUploadFiles = Array.isArray(req.files) && req.files.length > 0;
//   const parsedSettings =
//     req.body.settings !== undefined
//       ? parseSettingsInput(req.body.settings)
//       : undefined;

//   const section = await HomepageSection.findById(sectionId);

//   if (!section) {
//     return res.status(404).json({
//       success: false,
//       message: "Homepage section not found",
//     });
//   }

//   if (title !== undefined) section.title = title;
//   if (type !== undefined) section.type = type;
//   if (order !== undefined) section.order = order;
//   if (status !== undefined) section.status = status;
//   const sectionType = type !== undefined ? type : section.type;

//   if (parsedSettings !== undefined || hasUploadFiles) {
//     const baseSettings =
//       parsedSettings !== undefined
//         ? { ...(section.settings || {}), ...parsedSettings }
//         : JSON.parse(JSON.stringify(section.settings || {}));

//     const settingsWithUploads = await applyUploadedBannerImages(
//       sectionType,
//       baseSettings,
//       req.files
//     );

//     section.settings = getValidatedSettings(sectionType, settingsWithUploads);
//   }

//   await section.save();
//   await invalidateHomepageCache();

//   res.status(200).json({
//     success: true,
//     section,
//   });
// });

// const deleteHomepageSection = asyncHandler(async (req, res) => {
//   const { sectionId } = req.params;

//   const deletedSection = await HomepageSection.findByIdAndDelete(sectionId);

//   if (!deletedSection) {
//     return res.status(404).json({
//       success: false,
//       message: "Homepage section not found",
//     });
//   }

//   await invalidateHomepageCache();

//   res.status(200).json({
//     success: true,
//     message: "Homepage section deleted successfully",
//   });
// });

// const reorderHomepageSections = asyncHandler(async (req, res) => {
//   const { sectionOrders } = req.body;

//   if (!Array.isArray(sectionOrders) || sectionOrders.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "sectionOrders must be a non-empty array",
//     });
//   }

//   const bulkOperations = sectionOrders.map((item, index) => {
//     if (!item || !item.sectionId) {
//       const error = new Error(`sectionOrders[${index}].sectionId is required`);
//       error.statusCode = 400;
//       throw error;
//     }

//     if (typeof item.order !== "number") {
//       const error = new Error(`sectionOrders[${index}].order must be a number`);
//       error.statusCode = 400;
//       throw error;
//     }

//     return {
//       updateOne: {
//         filter: { _id: item.sectionId },
//         update: { $set: { order: item.order } },
//       },
//     };
//   });

//   await HomepageSection.bulkWrite(bulkOperations);
//   await invalidateHomepageCache();

//   const sections = await HomepageSection.find({})
//     .sort({ order: 1, createdAt: 1 })
//     .lean();

//   res.status(200).json({
//     success: true,
//     sections,
//   });
// });

// const getHomepage = asyncHandler(async (req, res) => {
//   const cachedSections = await getHomepageCache();

//   if (cachedSections) {
//     return res.status(200).json({
//       success: true,
//       source: "cache",
//       sections: cachedSections,
//     });
//   }

//   const sections = await buildHomepageSections();
//   await setHomepageCache(sections);

//   res.status(200).json({
//     success: true,
//     source: "database",
//     sections,
//   });
// });

// module.exports = {
//   listHomepageSections,
//   getHomepageSectionById,
//   createHomepageSection,
//   updateHomepageSection,
//   deleteHomepageSection,
//   reorderHomepageSections,
//   getHomepage,
// };






























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

  const settingsWithUploads = await applyUploadedBannerImages(
    type,
    parsedSettings,
    req.files,
    req.body
  );

  const validatedSettings = getValidatedSettings(type, settingsWithUploads);

  const section = new HomepageSection({
    title,
    type,
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

  if (title !== undefined) section.title = title;
  if (type !== undefined) section.type = type;
  if (order !== undefined) section.order = order;
  if (status !== undefined) section.status = status;

  const sectionType = type !== undefined ? type : section.type;

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

    const settingsWithUploads = await applyUploadedBannerImages(
      sectionType,
      baseSettings,
      req.files,
      req.body
    );

    section.settings = getValidatedSettings(sectionType, settingsWithUploads);
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
  const cached = await getHomepageCache();

  if (cached) {
    return res.status(200).json({
      success: true,
      source: "cache",
      sections: cached,
    });
  }

  const sections = await buildHomepageSections();
  await setHomepageCache(sections);

  res.status(200).json({
    success: true,
    source: "database",
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