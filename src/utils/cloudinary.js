

import { v2 as cloudinary } from "cloudinary";

let uploadHandler = async (fileOrBuffer) => {
    if (typeof fileOrBuffer === "string") {
        return cloudinary.uploader.upload(fileOrBuffer, { resource_type: "auto" });
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            (error, response) => {
                if (error) reject(error);
                else resolve(response);
            }
        );
        uploadStream.end(fileOrBuffer);
    });
};

let deleteHandler = async (publicId, options = {}) => cloudinary.uploader.destroy(publicId, options);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (fileOrBuffer) => {
    // Supports both local temp file path and in-memory buffer uploads.
    if (!fileOrBuffer) return null;

    try {
        return await uploadHandler(fileOrBuffer);

    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        return null;
    }
};

export const deleteFromCloudinary = async (publicId, options = {}) => {
    // Removes previously uploaded assets using Cloudinary public_id.
    try {
        await deleteHandler(publicId, options);
    } catch (error) {
        console.error("Cloudinary delete error:", error);
    }
};

export const setCloudinaryHandlersForTests = (overrides = {}) => {
    uploadHandler = overrides.uploadHandler || uploadHandler;
    deleteHandler = overrides.deleteHandler || deleteHandler;
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

