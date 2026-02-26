/**
 * File: D:\Fs\Blog\backend\src\models\comment.model.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import mongoose,{Schema} from "mongoose";

const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: "Post"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    
},{timestamps: true})

// Optimizes post comment feed queries and owner-specific lookups.
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ owner: 1, createdAt: -1 });

export const Comment= mongoose.model("Comment", commentSchema);
