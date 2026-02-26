/**
 * File: D:\Fs\Blog\backend\src\utils\cloudinary.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (fileOrBuffer) => {
    // Supports both local temp file path and in-memory buffer uploads.
    if (!fileOrBuffer) return null;

    try {
        // If a string path is provided, use the uploader.upload helper
        if (typeof fileOrBuffer === "string") {
            const result = await cloudinary.uploader.upload(fileOrBuffer, { resource_type: "auto" });
            return result;
        }

        // Otherwise assume a buffer and upload via upload_stream
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: "auto" },
                (error, response) => {
                    if (error) reject(error);
                    else resolve(response);
                }
            );
            uploadStream.end(fileOrBuffer);
        });

        return result;

    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        return null;
    }
};

export const deleteFromCloudinary = async (publicId) => {
    // Removes previously uploaded assets using Cloudinary public_id.
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary delete error:", error);
    }
};

export const extractPublicId = (url) => {
    // Derives public_id from a full Cloudinary URL.
    if (!url) return null;

    const withoutQuery = url.split("?")[0];

    const parts = withoutQuery.split("/");
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) return null;

    // everything after /upload/
    const publicIdWithExt = parts
        .slice(uploadIndex + 1)
        .join("/");

    // remove version (v123456)
    const cleaned = publicIdWithExt.replace(/^v\d+\//, "");

    // remove file extension
    return cleaned.replace(/\.[^/.]+$/, "");
};

