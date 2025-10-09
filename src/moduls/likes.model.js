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

export const Likes = mongoose.model("Like", likeSchema);