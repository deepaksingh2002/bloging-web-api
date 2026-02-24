/**
 * File: D:\Fs\Blog\backend\src\routers\subscription.router.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { Router } from "express";
import { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription);

router.route("/u/:subscriberId").get(getSubscribedChannels);


export default router;
