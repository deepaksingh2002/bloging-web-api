import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (buffer) => {
    if (!buffer) return null;

    try {
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: "auto" },
                (error, response) => {
                    if (error) reject(error);
                    else resolve(response);
                }
            );
            uploadStream.end(buffer);
        });

        return result;

    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        return null;
    }
};
