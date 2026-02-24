/**
 * File: D:\Fs\Blog\backend\src\models\subscription.model.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import mongoose,{Schema} from "mongoose";

const subscriptionSchema= new  Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
