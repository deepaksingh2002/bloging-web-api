import mongoose, { Schema } from "mongoose";
import Jwt from "jsonwebtoken" 
import bcrypt from "bcrypt"
import { config } from "../config/config.js";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true, 
        lowercase: true, 
        trim: true,
        index: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        
    },
    password: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String
    }

},{timestamps: true})

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    this.password= await bcrypt.hash(this.password, 10)
    next()
})

userSchema.method.isPasswordCorrect= async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.method.generateAccessToken= function(){
    return Jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        config.accessTokenSecret ,
        {
            expiresIn: config.accessTokenExpiry
        }
    )
}

userSchema.method.generateRefreshToken= function(){
    return Jwt.sign(
        {
            _id: this._id
        },
        config.refreshTokenSecret,
        {
            expiresIn: config.refreshTokenExpiry
        }
    )
}


export const User= mongoose.model("User", userSchema);