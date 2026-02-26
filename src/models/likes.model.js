/**
 * File: D:\Fs\Blog\backend\src\models\likes.model.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import mongoose,{Schema} from "mongoose";

const likeSchema = new Schema(
    {
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
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

likeSchema.index(
    { post: 1, user: 1 },
    // Enforces one like per user per post.
    { unique: true, partialFilterExpression: { post: { $type: "objectId" } } }
);

likeSchema.index(
    { comment: 1, user: 1 },
    // Enforces one like per user per comment.
    { unique: true, partialFilterExpression: { comment: { $type: "objectId" } } }
);

export const Like = mongoose.model("Like", likeSchema);
