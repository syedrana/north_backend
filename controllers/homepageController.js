const redis = require("../config/redis");
const HomepageSection = require("../models/homepageSection");
const { buildHomepageSections } = require("../services/homepageSectionService");

const HOMEPAGE_CACHE_KEY = "homepage_data";
const HOMEPAGE_CACHE_TTL_SECONDS = 60 * 5;

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const createHomepageSection = asyncHandler(async (req, res) => {
  const { title, type, order, status, settings } = req.body;

  if (!title || !type) {
    return res.status(400).json({
      success: false,
      message: "title and type are required",
    });
  }

  const section = new HomepageSection({
    title,
    type,
    order,
    status,
    settings,
  });

  await section.save();

  res.status(201).json({
    success: true,
    section,
  });
});

const updateHomepageSection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const { title, type, order, status, settings } = req.body;

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
  if (settings !== undefined) section.settings = settings;

  await section.save();

  res.status(200).json({
    success: true,
    section,
  });
});

const getHomepage = asyncHandler(async (req, res) => {
  const sections = await buildHomepageSections();

  res.status(200).json({
    success: true,
    sections,
  });
});

const getHomepageData = async (req, res, next) => {
  try {
    try {
      const cachedValue = await redis.get(HOMEPAGE_CACHE_KEY);

      if (cachedValue) {
        return res.status(200).json({
          success: true,
          source: "cache",
          sections: JSON.parse(cachedValue),
        });
      }
    } catch (cacheReadError) {
      console.error("Homepage cache read failed:", cacheReadError.message);
    }

    const sections = await buildHomepageSections();

    try {
      await redis.set(
        HOMEPAGE_CACHE_KEY,
        JSON.stringify(sections),
        "EX",
        HOMEPAGE_CACHE_TTL_SECONDS
      );
    } catch (cacheWriteError) {
      console.error("Homepage cache write failed:", cacheWriteError.message);
    }

    return res.status(200).json({
      success: true,
      source: "database",
      sections,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHomepageSection,
  updateHomepageSection,
  HOMEPAGE_CACHE_KEY,
  HOMEPAGE_CACHE_TTL_SECONDS,
  getHomepageData,
  getHomepage,
};
