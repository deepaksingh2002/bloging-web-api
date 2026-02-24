/**
 * File: D:/Fs/Blog/backend/src/controllers/subscription.controller.js
 * Purpose: Subscription handlers for channel follow/unfollow and listing.
 */

import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";

/**
 * Toggle subscription for current user against a channel user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  if (subscriberId.toString() === channelId) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    await existingSubscription.deleteOne();
    return res.status(200).json(
      new ApiResponse(200, null, "Unsubscribed successfully")
    );
  }

  const newSubscription = await Subscription.create({
    subscriber: subscriberId,
    channel: channelId,
  });

  return res.status(201).json(
    new ApiResponse(201, newSubscription, "Subscribed successfully")
  );
});

/**
 * Fetch all subscribers for a channel.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscribers = await Subscription.find({ channel: channelId }).populate(
    "subscriber",
    "username email"
  );

  return res.status(200).json(
    new ApiResponse(200, subscribers, "Subscribers fetched successfully")
  );
});

/**
 * Fetch all channels subscribed by a user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate(
    "channel",
    "username email"
  );

  return res.status(200).json(
    new ApiResponse(200, subscriptions, "Subscribed channels fetched successfully")
  );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};
