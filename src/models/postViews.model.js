/**
 * File: D:\Fs\Blog\backend\src\models\postViews.model.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import mongoose,{Schema} from "mongoose";

const postViewSchema = new Schema({
    
    post: {
        type: Schema.Types.ObjectId,
        ref: "Post"
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }

}, {timestamps: true})

export const PostView = mongoose.model("PostView", postViewSchema);
