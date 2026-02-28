import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

import { app } from "../src/app.js";
import { User } from "../src/models/user.model.js";
import { AboutProfile } from "../src/models/aboutProfile.model.js";
import { setResumeUploaderForTests } from "../src/services/about.service.js";

let mongod;
let ownerUser;
let nonOwnerUser;

const makeAccessToken = (userId) =>
  jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
  process.env.OWNER_EMAIL = "owner@example.com";

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

beforeEach(async () => {
  await User.deleteMany({});
  await AboutProfile.deleteMany({});

  ownerUser = await User.create({
    fullName: "Owner User",
    username: "owner",
    email: "owner@example.com",
    password: "Password@123",
    role: "user",
  });

  nonOwnerUser = await User.create({
    fullName: "Random User",
    username: "random",
    email: "random@example.com",
    password: "Password@123",
    role: "user",
  });

  setResumeUploaderForTests(async () => ({
    url: "https://cdn.example.com/resume.pdf",
    public_id: "resume-public-id",
  }));
});

after(async () => {
  setResumeUploaderForTests(null);
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

test("public GET /api/v1/about returns about profile", async () => {
  await AboutProfile.create({
    singletonKey: "about_profile",
    fullName: "Owner User",
    headline: "Backend Engineer",
    summary: "I build APIs",
    location: "Remote",
    email: "owner@example.com",
    phone: "+123456789",
    skills: ["Node.js", "MongoDB"],
    experience: "5 years",
    education: "B.Tech",
    updatedBy: ownerUser._id,
  });

  const response = await request(app).get("/api/v1/about");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.fullName, "Owner User");
});

test("owner can update about profile", async () => {
  const token = makeAccessToken(ownerUser._id.toString());

  const response = await request(app)
    .put("/api/v1/about")
    .set("Authorization", `Bearer ${token}`)
    .send({
      fullName: "Owner User",
      headline: "Senior Backend Engineer",
      summary: "Building scalable systems",
      location: "Bengaluru",
      email: "owner@example.com",
      phone: "+919999999999",
      skills: ["Node.js", "Express", "MongoDB"],
      experience: "6 years",
      education: "B.Tech CSE",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.headline, "Senior Backend Engineer");
});

test("non-owner is blocked from updating about profile", async () => {
  const token = makeAccessToken(nonOwnerUser._id.toString());

  const response = await request(app)
    .put("/api/v1/about")
    .set("Authorization", `Bearer ${token}`)
    .send({
      fullName: "Owner User",
      headline: "Senior Backend Engineer",
      summary: "Building scalable systems",
      location: "Bengaluru",
      email: "owner@example.com",
      phone: "+919999999999",
      skills: ["Node.js", "Express", "MongoDB"],
      experience: "6 years",
      education: "B.Tech CSE",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("owner resume upload and public download flow works", async () => {
  const token = makeAccessToken(ownerUser._id.toString());

  await request(app)
    .put("/api/v1/about")
    .set("Authorization", `Bearer ${token}`)
    .send({
      fullName: "Owner User",
      headline: "Senior Backend Engineer",
      summary: "Building scalable systems",
      location: "Bengaluru",
      email: "owner@example.com",
      phone: "+919999999999",
      skills: ["Node.js", "Express", "MongoDB"],
      experience: "6 years",
      education: "B.Tech CSE",
    });

  const uploadResponse = await request(app)
    .post("/api/v1/about/resume")
    .set("Authorization", `Bearer ${token}`)
    .attach("resume", Buffer.from("%PDF-1.4 mocked"), {
      filename: "resume.pdf",
      contentType: "application/pdf",
    });

  assert.equal(uploadResponse.status, 200);
  assert.equal(uploadResponse.body.success, true);
  assert.equal(uploadResponse.body.data.resumeUrl, "https://cdn.example.com/resume.pdf");

  const downloadResponse = await request(app).get("/api/v1/about/resume/download");
  assert.equal(downloadResponse.status, 302);
  assert.equal(downloadResponse.headers.location, "https://cdn.example.com/resume.pdf");
});
