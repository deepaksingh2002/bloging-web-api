import { configDotenv } from "dotenv";

configDotenv();

export const config = {
    port: process.env.PORT,
    corsOrigin: process.env.CORS_ORIGIN,
    databaseUrl: process.env.MONGO_CONNECTION_STRING,
    env: process.env.NODE_ENV,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,    
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
    cloudinaryCloud: process.env.CLOUDINARY_CLOUD,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    frontendDomain: process.env.FRONTEND_DOMAIN,
}

