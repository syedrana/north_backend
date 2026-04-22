const HOMEPAGE_CACHE_TTL_MS = 10 * 60 * 1000;

let cacheValue = null;
let cacheExpiresAt = 0;

const getHomepageCache = async () => {
  const now = Date.now();

  if (!cacheValue || now >= cacheExpiresAt) {
    cacheValue = null;
    cacheExpiresAt = 0;
    return null;
  }

  return cacheValue;
};

const setHomepageCache = async (data) => {
  cacheValue = data;
  cacheExpiresAt = Date.now() + HOMEPAGE_CACHE_TTL_MS;

  return data;
};

const invalidateHomepageCache = async () => {
  cacheValue = null;
  cacheExpiresAt = 0;
};

module.exports = {
  getHomepageCache,
  setHomepageCache,
  invalidateHomepageCache,
};
