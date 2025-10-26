import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../moduls/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudnary.js"
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


const registerUser = asyncHandler( async(req, res) => {
    const {username, email, password} = req.body
    if([username, email, password].some((field)=> field?.trim() === "")){
        throw new ApiError(400, "All fields are required!")
    }



    const existedUser= User.findOne({
        $or:[{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "email or Username already existed!")
    }
    console.log("FILES:: ", req.file);
    const avatarLocalPath= req.files?.avatar[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar fild is required!" )
    }
    
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(400, "error while uploading avatar!")
    }

    const user= await User.create({
        fullname,
        avatar: avatar.url,
        email: email,
        password,
        username: username.toLowerCase()
    })
    const createdUser= await User.findById(user._id).select("-password, -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Somthing went wrong while registering user.")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, " User registered successfully")
    )
})

const logInUser= asyncHandler(async(req, res) => {
    //req from body email, username, password.
    //check user is exist or not.
    //check password
    //access refreshToken and send token in cookies.
    // send res Login successfully.


    const{email, username, password}=req.body;
    if(!email || !username){
        throw new ApiError(400, "Email or username is required.")
    }

    const user= await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404, "user not found!")
    }
    const isPasswordVailed= await user.isPasswordCorrect(password)
    if(!isPasswordVailed){
        throw new ApiError(401, "Invilad user credential")
    }

    const {accessToken, refreshToken}= await genrateAccessAndRefreshToken(user._id)
    const logedInUser= user.findById(user._id).select("-password -refreshToken")

    options= {
        httpOnly: true,
        secure : true
    }

     return res.status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", refreshToken, options )
     .json(
        new ApiResponse(200, 
        {
            user:logedInUser, refreshToken, accessToken
        },
        "user LogdIn successfully."
    ))

})

const logOutUser= asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(req.user._id,{
        $unset:{
            refreshToken: 1
        }
    },{new: true})

    const options={
            httpOnly: true,
            secure: true
        }
    return res.status(200)
    .cookie("accessToken", options)
    .cookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User LogOut seccessfully")
    )
})

export {registerUser, logInUser, logOutUser}