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