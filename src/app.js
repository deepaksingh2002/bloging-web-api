import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173/",
    credentials: true,
}))

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routers/user.router.js"
import postRouter from "./routers/post.router.js"
// import commentRouter from "./router/comment.router.js"
import likeRouter from "./routers/like.router.js"
import subscriptionRouter from "./routers/subscription.router.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/post", postRouter)
// app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)

export { app }