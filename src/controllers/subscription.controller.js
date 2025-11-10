import mongoose,{isValidObjectId} from 'mongoose';
import asyncHandler from 'express-async-handler';
import Subscription from '../models/subscription.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import User from '../models/user.model.js';




const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const subscriberId = req.User._id;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel ID");
    }
    if(subscriberId.toString() === channelId){
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }
    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })
    if(existingSubscription){
        await existingSubscription.deleteOne(
            {
                _id: existingSubscription._id
            }
        );
        return res.status(200).json(
            new ApiResponse(200, null, "Unsubscribed successfully")
        )
    }
    const newSubscription = new Subscription({
        subscriber: subscriberId,
        channel: channelId
    })
    await newSubscription.save();

    return res.status(201).json(
        new ApiResponse(201, "Subscribed successfully")
    )
});



export {
    toggleSubscription
}