import { ApiError } from "../utils/ApiError.js";

const notFoundHandler = (req, _res, next) => {
  // Converts unknown routes into a consistent API 404 error.
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, _req, res, _next) => {
  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    err.statusCode = 400;
    err.message = "File is too large";
  }

  // Final error middleware that normalizes all errors into JSON payloads.
  const statusCode = err?.statusCode && Number(err.statusCode) >= 400
    ? Number(err.statusCode)
    : 500;

  const message =
    err?.message || (statusCode === 500 ? "Internal server error" : "Request failed");

  const payload = {
    statusCode,
    data: null,
    message,
    success: false,
    error: Array.isArray(err?.error) ? err.error : [],
  };

  if (process.env.NODE_ENV !== "production" && err?.stack) {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
};

export { notFoundHandler, errorHandler };
