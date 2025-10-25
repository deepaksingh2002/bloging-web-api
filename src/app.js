import cookieParser from "cookie-parser";
import express, { json } from "express"

const app = express()

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import usoerRouter from "./router/user.router.js"

app.use("api/v1/user", usoerRouter)


export {app}