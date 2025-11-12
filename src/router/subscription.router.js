import { Router } from "express";
import { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/toggleSubscription/:channelId").post(verifyJWT, toggleSubscription);

router.route("/getChannelSubscribers/:channelId").get(verifyJWT, getUserChannelSubscribers);

router.route("/getSubscribedChannels/:subscriberId").get(verifyJWT, getSubscribedChannels);

export default router;