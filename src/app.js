import cookieParser from "cookie-parser";
import cors from "cors";
import express, { json } from "express"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./router/user.router.js"
import postRouter from "./router/post.router.js"
// import commentRouter from "./router/comment.router.js"
import likeRouter from "./router/like.router.js"
import subscriptionRouter from "./router/subscription.router.js"

app.use("api/v1/user", userRouter)
app.use("api/v1/post", postRouter)
// app.use("api/v1/comment", commentRouter)
app.use("api/v1/like", likeRouter)
app.use("api/v1/follow", subscriptionRouter)

export default app;


export {app}