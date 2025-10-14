import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";
import {config} from "../config/config.js"
import {User} from "../moduls/user.model.js";



export const verifyJWT= asyncHandler( async(req, _, next) => {
    try {
        const token = req.cookies.accessToken || req.header("Authentication")?.replace("Bearer", "");
        if(!token){
            throw new ApiError(401, "Invalid access token.");
        }
        const decodedToken= Jwt.verify(token, config.accessTokenSecret);
        const user= await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!user){
            throw new ApiError(401, "Unauthorized access.");
        }
        req.user= user;
        next()
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token.");
    }
})

