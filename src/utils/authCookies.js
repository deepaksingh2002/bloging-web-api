/**
 * File: D:/Fs/Blog/backend/src/utils/authCookies.js
 * Purpose: Centralized auth cookie configuration for login/refresh/logout flows.
 */

// Converts duration strings like "15m", "1h", "7d" into milliseconds.
const parseDurationToMs = (duration) => {
  if (!duration || typeof duration !== "string") return null;

  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return Number.isFinite(value) ? value * unitMs[unit] : null;
};

// Builds shared cookie options and adapts SameSite/Secure for local vs deployed requests.
const getBaseCookieOptions = (req) => {
  const origin = req.get("origin") || "";
  const isLocalOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : String(forwardedProtoHeader || "")
        .split(",")[0]
        .trim()
        .toLowerCase();
  const isHttps = req.secure || forwardedProto === "https";
  const secure = isHttps && !isLocalOrigin;

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    path: "/",
  };
};

// Cookie options for access token lifetime.
const getAccessTokenCookieOptions = (req) => {
  const maxAge = parseDurationToMs(process.env.ACCESS_TOKEN_EXPIRY);
  return maxAge
    ? { ...getBaseCookieOptions(req), maxAge }
    : getBaseCookieOptions(req);
};

// Cookie options for refresh token lifetime.
const getRefreshTokenCookieOptions = (req) => {
  const maxAge = parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRY);
  return maxAge
    ? { ...getBaseCookieOptions(req), maxAge }
    : getBaseCookieOptions(req);
};

export {
  getBaseCookieOptions,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
};
