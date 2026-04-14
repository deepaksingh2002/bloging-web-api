import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import {
  app,
  createBaseFixture,
  setupRoleAccessTestEnvironment,
  clearRoleAccessCollections,
  teardownRoleAccessTestEnvironment,
} from "./role-access.test-helpers.js";
import { Post } from "../src/models/post.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Like } from "../src/models/likes.model.js";
import { User } from "../src/models/user.model.js";

let fixture;

before(setupRoleAccessTestEnvironment);
beforeEach(async () => {
  await clearRoleAccessCollections();
  fixture = await createBaseFixture();
});
after(teardownRoleAccessTestEnvironment);

test("admin can view dashboards and fully moderate posts/comments with audit logs", async () => {
  const { applicantUser, commenterUser, posts, tokens } = fixture;

  await request(app)
    .post("/api/v1/users/apply-author")
    .set("Authorization", `Bearer ${tokens.applicant}`)
    .send({
      bio: "Pending author",
      expertise: "Node.js",
      motivation: "Please approve me",
    })
    .expect(200);

  const commentOneResponse = await request(app)
    .post(`/api/v1/comments/posts/${posts.alpha._id}/comments`)
    .set("Authorization", `Bearer ${tokens.commenter}`)
    .send({ content: "First comment" });
  assert.equal(commentOneResponse.status, 201);

  const commentTwoResponse = await request(app)
    .post(`/api/v1/comments/posts/${posts.gamma._id}/comments`)
    .set("Authorization", `Bearer ${tokens.commenter}`)
    .send({ content: "Second comment" });
  assert.equal(commentTwoResponse.status, 201);

  const commentOneId = commentOneResponse.body.data._id;
  const commentTwoId = commentTwoResponse.body.data._id;

  await request(app)
    .patch(`/api/v1/likes/posts/${posts.alpha._id}/like`)
    .set("Authorization", `Bearer ${tokens.commenter}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/likes/comments/${commentTwoId}/like`)
    .set("Authorization", `Bearer ${tokens.commenter}`)
    .expect(200);

  const adminDashboardResponse = await request(app)
    .get("/api/v1/admin/dashboard?recentLimit=2&pendingLimit=2")
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(adminDashboardResponse.status, 200);
  assert.equal(adminDashboardResponse.body.data.users.pendingAuthorApplications, 1);
  assert.equal(adminDashboardResponse.body.data.posts.totalPosts, 3);
  assert.equal(adminDashboardResponse.body.data.engagement.comments, 2);

  const adminProfileResponse = await request(app)
    .get("/api/v1/admin/profile")
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(adminProfileResponse.status, 200);
  assert.equal(adminProfileResponse.body.data.profile.role, "admin");

  const deleteCommentResponse = await request(app)
    .delete(`/api/v1/admin/comments/${commentOneId}`)
    .set("Authorization", `Bearer ${tokens.admin}`)
    .send({ reason: "spam" });
  assert.equal(deleteCommentResponse.status, 200);

  const deletedCommentCheck = await Comment.findById(commentOneId);
  assert.equal(deletedCommentCheck, null);
  assert.equal(await Like.countDocuments({ comment: commentOneId }), 0);

  const deletePostResponse = await request(app)
    .delete(`/api/v1/admin/posts/${posts.gamma._id}`)
    .set("Authorization", `Bearer ${tokens.admin}`)
    .send({ reason: "irrelevant content" });
  assert.equal(deletePostResponse.status, 200);

  const deletedPostCheck = await Post.findById(posts.gamma._id);
  assert.equal(deletedPostCheck, null);
  assert.equal(await Comment.countDocuments({ post: posts.gamma._id }), 0);
  assert.equal(await Like.countDocuments({ post: posts.gamma._id }), 0);
  assert.equal(await Like.countDocuments({ comment: commentTwoId }), 0);

  const moderationLogsResponse = await request(app)
    .get("/api/v1/admin/moderation-logs?page=1&limit=20")
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(moderationLogsResponse.status, 200);
  assert.equal(moderationLogsResponse.body.data.length, 2);
  assert.deepEqual(
    moderationLogsResponse.body.data.map((entry) => entry.action).sort(),
    ["delete_comment", "delete_post"]
  );

  const adminApplicationsResponse = await request(app)
    .get("/api/v1/admin/author-applications")
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(adminApplicationsResponse.status, 200);
  assert.equal(adminApplicationsResponse.body.data.length, 1);

  const approveResponse = await request(app)
    .patch(`/api/v1/admin/author-applications/${applicantUser._id}/approve`)
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.data.role, "author");
});

test("owner admin access can delete a normal user from the admin user list", async () => {
  const { commenterUser, tokens } = fixture;

  const deleteUserResponse = await request(app)
    .delete(`/api/v1/admin/users/${commenterUser._id}`)
    .set("Authorization", `Bearer ${tokens.owner}`);

  assert.equal(deleteUserResponse.status, 200);
  assert.equal(deleteUserResponse.body.message, "User deleted successfully");

  const deletedUserCheck = await User.findById(commenterUser._id);
  assert.equal(deletedUserCheck, null);
});

test("admin can update their own profile from the admin profile endpoint", async () => {
  const { adminUser, tokens } = fixture;

  const updateResponse = await request(app)
    .patch("/api/v1/admin/profile")
    .set("Authorization", `Bearer ${tokens.admin}`)
    .field("fullName", "Updated Admin User")
    .field("bio", "Updated admin bio");

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.data.profile.fullName, "Updated Admin User");
  assert.equal(updateResponse.body.data.profile.bio, "Updated admin bio");

  const updatedAdmin = await User.findById(adminUser._id);
  assert.equal(updatedAdmin.fullName, "Updated Admin User");
  assert.equal(updatedAdmin.bio, "Updated admin bio");
});
