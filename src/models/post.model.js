/**
 * File: D:\Fs\Blog\backend\src\models\post.model.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        thumbnail: {
            type: String, // cloudnary url
            required: true
        },
        content: {
            type: String,
            required: true
        },
        catagry: {
            type: String,
            enum: ["Tech","Technology", "Health", "Science", "Sports", "Entertainment"],
            default: "Technology"
        },

        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }, { timestamps: true }
)

export const Post = mongoose.model("Post", postSchema)
