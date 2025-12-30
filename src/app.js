import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express()

app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman / server-side calls
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

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