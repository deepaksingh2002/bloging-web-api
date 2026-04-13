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

let fixture;

before(setupRoleAccessTestEnvironment);
beforeEach(async () => {
  await clearRoleAccessCollections();
  fixture = await createBaseFixture();
});
after(teardownRoleAccessTestEnvironment);

test("visitor and normal user access rules are enforced", async () => {
  const { applicantUser, adminUser, commenterUser, posts, tokens } = fixture;

  const listResponse = await request(app).get("/api/v1/post/getAll-post");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.success, true);
  assert.equal(listResponse.body.data.length, 3);

  const singlePostResponse = await request(app).get(`/api/v1/post/get-post/${posts.alpha._id}`);
  assert.equal(singlePostResponse.status, 200);
  assert.equal(singlePostResponse.body.data.views, 3);

  const visitorCommentResponse = await request(app)
    .post(`/api/v1/comments/posts/${posts.alpha._id}/comments`)
    .send({ content: "No auth" });
  assert.equal(visitorCommentResponse.status, 401);

  const visitorLikeResponse = await request(app).patch(`/api/v1/likes/posts/${posts.alpha._id}/like`);
  assert.equal(visitorLikeResponse.status, 401);

  const commenterProfileResponse = await request(app)
    .get("/api/v1/users/profile")
    .set("Authorization", `Bearer ${tokens.commenter}`);
  assert.equal(commenterProfileResponse.status, 200);
  assert.equal(commenterProfileResponse.body.data.user.username, "commenter");

  const commenterAuthorDashboardResponse = await request(app)
    .get("/api/v1/author/dashboard")
    .set("Authorization", `Bearer ${tokens.commenter}`);
  assert.equal(commenterAuthorDashboardResponse.status, 403);

  const adminUserProfileResponse = await request(app)
    .get("/api/v1/users/profile")
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(adminUserProfileResponse.status, 403);
  assert.match(adminUserProfileResponse.body.message, /admin profile access/i);

  const authorApplyResponse = await request(app)
    .post("/api/v1/users/apply-author")
    .set("Authorization", `Bearer ${tokens.applicant}`)
    .send({
      bio: "Writes backend tutorials",
      expertise: "Node.js",
      portfolioUrl: "https://portfolio.example.com",
      motivation: "I want to publish technical content",
    });
  assert.equal(authorApplyResponse.status, 200);
  assert.equal(authorApplyResponse.body.data.authorApplication.status, "pending");

  const adminDashboardDeniedResponse = await request(app)
    .get("/api/v1/admin/dashboard")
    .set("Authorization", `Bearer ${tokens.commenter}`);
  assert.equal(adminDashboardDeniedResponse.status, 403);

  const previousOwnerUserId = process.env.OWNER_USER_ID;
  process.env.OWNER_USER_ID = commenterUser._id.toString();

  try {
    const ownerAdminDashboardResponse = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${tokens.commenter}`);
    assert.equal(ownerAdminDashboardResponse.status, 200);

    const ownerProfileResponse = await request(app)
      .get("/api/v1/users/profile")
      .set("Authorization", `Bearer ${tokens.commenter}`);
    assert.equal(ownerProfileResponse.status, 403);
    assert.match(ownerProfileResponse.body.message, /admin profile access/i);
  } finally {
    process.env.OWNER_USER_ID = previousOwnerUserId;
  }

  const approveResponse = await request(app)
    .patch(`/api/v1/admin/author-applications/${applicantUser._id}/approve`)
    .set("Authorization", `Bearer ${tokens.admin}`);
  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.data.role, "author");

  const authorProfileDeniedResponse = await request(app)
    .get("/api/v1/users/profile")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(authorProfileDeniedResponse.status, 403);
  assert.match(authorProfileDeniedResponse.body.message, /author profile access/i);

  const authorDashboardResponse = await request(app)
    .get("/api/v1/author/dashboard")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(authorDashboardResponse.status, 200);
  assert.equal(authorDashboardResponse.body.data.posts.totalPosts, 3);
  assert.equal(authorDashboardResponse.body.data.engagement.postLikes, 0);

  const authorProfileResponse = await request(app)
    .get("/api/v1/author/profile")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(authorProfileResponse.status, 200);
  assert.equal(authorProfileResponse.body.data.profile.role, "author");

  const managedPostsResponse = await request(app)
    .get("/api/v1/author/posts/manage?limit=2")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(managedPostsResponse.status, 200);
  assert.equal(managedPostsResponse.headers["x-total-count"], "3");
  assert.equal(managedPostsResponse.body.data.length, 2);
});
