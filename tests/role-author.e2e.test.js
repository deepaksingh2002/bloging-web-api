import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import {
  app,
  createBaseFixture,
  setupRoleAccessTestEnvironment,
  clearRoleAccessCollections,
  teardownRoleAccessTestEnvironment,
  enableCloudinaryTestHandlers,
} from "./role-access.test-helpers.js";

let fixture;

before(setupRoleAccessTestEnvironment);
beforeEach(async () => {
  await clearRoleAccessCollections();
  enableCloudinaryTestHandlers();
  fixture = await createBaseFixture();
});
after(teardownRoleAccessTestEnvironment);

test("author dashboard tracks likes, comments, views, and own post controls", async () => {
  const { applicantUser, commenterUser, posts, tokens } = fixture;

  await request(app)
    .post("/api/v1/users/apply-author")
    .set("Authorization", `Bearer ${tokens.applicant}`)
    .send({
      bio: "Backend content creator",
      expertise: "Express and MongoDB",
      motivation: "I want to share backend knowledge",
    })
    .expect(200);

  await request(app)
    .patch(`/api/v1/admin/author-applications/${applicantUser._id}/approve`)
    .set("Authorization", `Bearer ${tokens.admin}`)
    .expect(200);

  const commentResponse = await request(app)
    .post(`/api/v1/comments/posts/${posts.alpha._id}/comments`)
    .set("Authorization", `Bearer ${tokens.commenter}`)
    .send({ content: "Good post" });
  assert.equal(commentResponse.status, 201);
  const commentId = commentResponse.body.data._id;

  const postLikeResponse = await request(app)
    .patch(`/api/v1/likes/posts/${posts.alpha._id}/like`)
    .set("Authorization", `Bearer ${tokens.commenter}`);
  assert.equal(postLikeResponse.status, 200);
  assert.equal(postLikeResponse.body.data.liked, true);

  const commentLikeResponse = await request(app)
    .patch(`/api/v1/likes/comments/${commentId}/like`)
    .set("Authorization", `Bearer ${tokens.commenter}`);
  assert.equal(commentLikeResponse.status, 200);
  assert.equal(commentLikeResponse.body.data.liked, true);

  const authorDashboardResponse = await request(app)
    .get("/api/v1/author/dashboard")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(authorDashboardResponse.status, 200);
  assert.equal(authorDashboardResponse.body.data.posts.totalPosts, 3);
  assert.equal(authorDashboardResponse.body.data.engagement.postLikes, 1);
  assert.equal(authorDashboardResponse.body.data.engagement.commentsOnPosts, 1);
  assert.equal(authorDashboardResponse.body.data.engagement.commentLikesOnPosts, 1);

  const authorProfileResponse = await request(app)
    .get("/api/v1/author/profile")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(authorProfileResponse.status, 200);
  assert.equal(authorProfileResponse.body.data.recentComments.length, 1);

  const managedPostsResponse = await request(app)
    .get("/api/v1/author/posts/manage?limit=10")
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(managedPostsResponse.status, 200);
  assert.equal(managedPostsResponse.body.data.length, 3);

  const alphaManagedPost = managedPostsResponse.body.data.find((post) => post.title === "Alpha Post");
  assert.ok(alphaManagedPost);
  assert.equal(alphaManagedPost.commentsCount, 1);
  assert.equal(alphaManagedPost.likesCount, 1);

  const createPostResponse = await request(app)
    .post("/api/v1/post/create-post")
    .set("Authorization", `Bearer ${tokens.applicant}`)
    .field("title", "Created by Author")
    .field("content", "Author can create posts")
    .field("catagry", "Tech")
    .attach("thumbnail", Buffer.from("fake-image-data"), {
      filename: "thumb.jpg",
      contentType: "image/jpeg",
    });
  assert.equal(createPostResponse.status, 201);
  assert.equal(createPostResponse.body.data.title, "Created by Author");

  const createdPostId = createPostResponse.body.data._id;

  const updateOwnPostResponse = await request(app)
    .put(`/api/v1/post/update-post/${createdPostId}`)
    .set("Authorization", `Bearer ${tokens.applicant}`)
    .field("title", "Created by Author Updated")
    .field("content", "Updated content")
    .attach("thumbnail", Buffer.from("fake-image-data-2"), {
      filename: "thumb-2.jpg",
      contentType: "image/jpeg",
    });
  assert.equal(updateOwnPostResponse.status, 200);
  assert.equal(updateOwnPostResponse.body.data.title, "Created by Author Updated");

  const deleteOwnPostResponse = await request(app)
    .delete(`/api/v1/post/delete-post/${createdPostId}`)
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(deleteOwnPostResponse.status, 200);

  const deletedOwnPostFetch = await request(app).get(`/api/v1/post/get-post/${createdPostId}`);
  assert.equal(deletedOwnPostFetch.status, 404);

  const updateResponse = await request(app)
    .put(`/api/v1/post/update-post/${posts.beta._id}`)
    .set("Authorization", `Bearer ${tokens.applicant}`)
    .send({ title: "Beta Post Updated" });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.data.title, "Beta Post Updated");

  const deleteResponse = await request(app)
    .delete(`/api/v1/post/delete-post/${posts.gamma._id}`)
    .set("Authorization", `Bearer ${tokens.applicant}`);
  assert.equal(deleteResponse.status, 200);

  const deletedPostFetch = await request(app).get(`/api/v1/post/get-post/${posts.gamma._id}`);
  assert.equal(deletedPostFetch.status, 404);
});
