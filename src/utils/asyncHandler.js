/**
 * File: D:\Fs\Blog\backend\src\utils\asyncHandler.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}


export { asyncHandler }
