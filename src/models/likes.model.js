/**
 * File: D:\Fs\Blog\backend\src\models\likes.model.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import mongoose,{Schema} from "mongoose";

const likeSchema = new Schema({
    post: {
        type: Schema.Types.ObjectId,
        ref: "Post"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
})

export const Like = mongoose.model("Like", likeSchema);
