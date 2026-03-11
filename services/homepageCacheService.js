const redis = require("../config/redis");

const HOMEPAGE_CACHE_KEY = "homepage_cache";
const HOMEPAGE_CACHE_TTL_SECONDS = 10 * 60;

const getHomepageCache = async () => {
  const cachedValue = await redis.get(HOMEPAGE_CACHE_KEY);

  if (!cachedValue) {
    return null;
  }

  return JSON.parse(cachedValue);
};

const setHomepageCache = async (data) => {
  const serialized = JSON.stringify(data);

  await redis.set(HOMEPAGE_CACHE_KEY, serialized, "EX", HOMEPAGE_CACHE_TTL_SECONDS);

  return data;
};

const invalidateHomepageCache = async () => {
  await redis.del(HOMEPAGE_CACHE_KEY);
};

module.exports = {
  getHomepageCache,
  setHomepageCache,
  invalidateHomepageCache,
};
