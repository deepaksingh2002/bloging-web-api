import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Error while generating tokens");
    }
};

export const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    // console.log("Req from body:: ", req.body);

    if ([fullName, email, password].some(f => !f || f.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    if (password?.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long")
    }
    if (password) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!regex.test(password)) {
            throw new ApiError(400, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
        }
    }

    const existedUser = await User.findOne({
        email
    });

    if (existedUser) {
        throw new ApiError(409, "User with this email already exists");
    }

    // Generate a unique username from email
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let isUsernameUnique = false;
    let counter = 1;
    while (!isUsernameUnique) {
        const userWithUsername = await User.findOne({ username });
        if (!userWithUsername) {
            isUsernameUnique = true;
        } else {
            username = `${baseUsername}${counter}`;
            counter++;
        }
    }

    const avatarBuffer = req.file?.buffer;
    let avatarUrl;
    if (avatarBuffer) {
        const avatar = await uploadOnCloudinary(avatarBuffer);
        if (!avatar?.url) throw new ApiError(500, "Avatar upload failed");
        avatarUrl = avatar.url;
    }

    const user = await User.create(
        { 
            fullName, 
            avatar: avatarUrl, 
            email, 
            password, 
            username

         });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});


export const logInUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!(email || username)) throw new ApiError(400, "Email or Username is required");

    const user = await User.findOne({ $or: [{ email }, { username }] });
    if (!user) throw new ApiError(404, "User not found");

    const valid = await user.isPasswordCorrect(password);
    if (!valid) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "Logged in successfully"
            )
        );
});

export const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

    return res.status(200)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
});

export const refereshAccessToken = asyncHandler(async( req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
    
        )
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh token is expired or used")
    
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refresh"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invaled refressh token")
    }
});
