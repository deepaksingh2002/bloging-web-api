import { ApiError } from "../utils/ApiError.js";

const buckets = new Map();

const clearExpired = (now) => {
  for (const [key, value] of buckets.entries()) {
    if (value.expiresAt <= now) {
      buckets.delete(key);
    }
  }
};

export const createInMemoryRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  keyPrefix = "global",
} = {}) => {
  return (req, _res, next) => {
    const now = Date.now();
    clearExpired(now);

    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const current = buckets.get(key);

    if (!current || current.expiresAt <= now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      return next(new ApiError(429, "Too many requests, please try again later"));
    }

    current.count += 1;
    buckets.set(key, current);
    return next();
  };
};
