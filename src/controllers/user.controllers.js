import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../moduls/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js";


const genrateAccessAndRefreshToken = async(userId) => {
    try {
        const user= await User.findById(userId);
        const accessToken= user.generateAccessToken();
        const refreshToken= user.generateRefreshToken();
        user.accessToken= accessToken;
        user.refreshToken= refreshToken;

        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Somthing went wrong while genrate access and refresh token.");
    }
}


