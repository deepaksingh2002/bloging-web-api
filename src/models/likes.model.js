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

likeSchema.pre("validate", function (next) {
    const hasPost = Boolean(this.post);
    const hasComment = Boolean(this.comment);

    // A like must target exactly one entity: either a post or a comment.
    if (hasPost === hasComment) {
        return next(new Error("Like must reference exactly one target: post or comment"));
    }

    next();
});

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
