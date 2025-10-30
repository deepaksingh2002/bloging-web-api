import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        thumbnill: {
            type: String, // cloudnary url
            required: true
        },
        content: {
            type: String,
            required: true
        },
        catagry: {
            type: String,
            enum: ["Technology", "Health", "Science", "Sports", "Entertainment"],
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
    },{timestamps: true}
)

export const Post = mongoose.model("Post", postSchema)