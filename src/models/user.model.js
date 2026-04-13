

import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username: {
        type: String,
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
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String // URL
    },
    bio: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    },
    role: {
        type: String,
<<<<<<< HEAD
        enum: ["user", "author", "admin", "superadmin"],
=======
        enum: ["user", "author", "admin"],
>>>>>>> 00dbadf2e6bf08ff9c8f137c95c1861007a2c99e
        default: "user"
    },
    authorApplication: {
        status: {
            type: String,
            enum: ["none", "pending", "approved", "rejected"],
            default: "none"
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 500
        },
        expertise: {
            type: String,
            trim: true,
            maxlength: 200
        },
        portfolioUrl: {
            type: String,
            trim: true
        },
        motivation: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        appliedAt: {
            type: Date
        },
        reviewedAt: {
            type: Date
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        }
    }
}, { timestamps: true });

// Hashes password only when it is created or modified.
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compares a plain-text password with the stored hash.
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Issues short-lived JWT used for authenticated API access.
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

// Issues long-lived JWT used to renew access sessions.
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model("User", userSchema);

