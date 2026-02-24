/**
 * File: D:/Fs/Blog/backend/src/utils/authCookies.js
 * Purpose: Centralized auth cookie configuration for login/refresh/logout flows.
 */

const getCookieOptions = (req) => {
  const origin = req.get("origin") || "";
  const isLocalOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isHttps = req.secure || forwardedProto === "https";
  const secure = isHttps && !isLocalOrigin;

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    path: "/",
  };
};

export { getCookieOptions };
