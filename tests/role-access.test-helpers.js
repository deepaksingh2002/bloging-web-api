import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

import { app } from "../src/app.js";
import { User } from "../src/models/user.model.js";
import { Post } from "../src/models/post.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Like } from "../src/models/likes.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import { AboutProfile } from "../src/models/aboutProfile.model.js";
import { ModerationLog } from "../src/models/moderationLog.model.js";
import { setCloudinaryHandlersForTests } from "../src/utils/cloudinary.js";

let mongod;

const makeAccessToken = (userId) =>
  jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

const createBaseFixture = async () => {
  const adminUser = await User.create({
    fullName: "Admin User",
    username: "admin",
    email: "admin@example.com",
    password: "Password@123",
    role: "admin",
  });

  const applicantUser = await User.create({
    fullName: "Author Applicant",
    username: "authorapplicant",
    email: "author@example.com",
    password: "Password@123",
    role: "user",
  });

  const commenterUser = await User.create({
    fullName: "Commenter User",
    username: "commenter",
    email: "commenter@example.com",
    password: "Password@123",
    role: "user",
  });

  const posts = await Post.create([
    {
      title: "Alpha Post",
      thumbnail: "https://cdn.example.com/alpha.jpg",
      content: "Alpha content",
      catagry: "Technology",
      owner: applicantUser._id,
      views: 2,
      isPublished: true,
    },
    {
      title: "Beta Post",
      thumbnail: "https://cdn.example.com/beta.jpg",
      content: "Beta content",
      catagry: "Tech",
      owner: applicantUser._id,
      views: 5,
      isPublished: false,
    },
    {
      title: "Gamma Post",
      thumbnail: "https://cdn.example.com/gamma.jpg",
      content: "Gamma content",
      catagry: "Health",
      owner: applicantUser._id,
      views: 1,
      isPublished: true,
    },
  ]);

  return {
    adminUser,
    applicantUser,
    commenterUser,
    posts: {
      alpha: posts[0],
      beta: posts[1],
      gamma: posts[2],
    },
    tokens: {
      admin: makeAccessToken(adminUser._id.toString()),
      applicant: makeAccessToken(applicantUser._id.toString()),
      commenter: makeAccessToken(commenterUser._id.toString()),
    },
  };
};

const setupRoleAccessTestEnvironment = async () => {
  process.env.NODE_ENV = "test";
  process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.OWNER_USER_ID = "";

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Like.syncIndexes(), ModerationLog.syncIndexes()]);
};

const clearRoleAccessCollections = async () => {
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Like.deleteMany({}),
    Subscription.deleteMany({}),
    AboutProfile.deleteMany({}),
    ModerationLog.deleteMany({}),
  ]);
};

const teardownRoleAccessTestEnvironment = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

const enableCloudinaryTestHandlers = () => {
  let uploadCounter = 0;
  setCloudinaryHandlersForTests({
    uploadHandler: async () => {
      uploadCounter += 1;
      return {
        url: `https://cdn.example.com/test-upload-${uploadCounter}.jpg`,
        public_id: `test-upload-${uploadCounter}`,
      };
    },
    deleteHandler: async () => ({ result: "ok" }),
  });
};

export {
  app,
  createBaseFixture,
  setupRoleAccessTestEnvironment,
  clearRoleAccessCollections,
  teardownRoleAccessTestEnvironment,
  enableCloudinaryTestHandlers,
};
