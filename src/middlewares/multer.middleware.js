/**
 * File: D:\Fs\Blog\backend\src\middlewares\multer.middleware.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import multer from "multer";
import fs from "fs";
import path from "path";

const tempDir = path.join(process.cwd(), "public/temp");

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, tempDir);
    },
    filename(req, file, cb) {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

export const upload = multer({ storage });


