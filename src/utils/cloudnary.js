import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/config.js";
import fs from 'fs';

cloudinary.config({ 
        cloud_name: config.cloudinaryCloud,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret
    });

    const uploadOnCloudinary = async (localFilePath) => {
        try {
            if(!localFilePath) return null
            //upload the file on cloudinary
            const response = await cloudinary.uploader.upload(localFilePath, {
                resource_type: 'auto'
            })
            //file has been uploaded successfull
            fs.unlinkSync(localFilePath)
            return response;
            
        } catch (error) {
            fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload opration got failed.
            return null
        }
    }

   export {uploadOnCloudinary}