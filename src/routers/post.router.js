

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createPost,
  getPosts,
  searchPosts,
  getPostById,
  deletePost,
  updatePost,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
<<<<<<< HEAD
import { verifyRoleAccess } from "../middlewares/owner.middleware.js";

const router = Router();

router
  .route("/create-post")
  .post(verifyJWT, verifyRoleAccess(["author", "admin", "superadmin"]), upload.single("thumbnail"), createPost);
=======
import { requireAuthor } from "../middlewares/role.middleware.js";

const router = Router();

router.route("/create-post").post(verifyJWT, requireAuthor, upload.single("thumbnail"), createPost);
>>>>>>> 00dbadf2e6bf08ff9c8f137c95c1861007a2c99e

router.route("/getAll-post").get(getPosts);
router.route("/search-post").get(searchPosts);

router.route("/get-post/:postId").get(getPostById);

<<<<<<< HEAD
router
  .route("/delete-post/:postId")
  .delete(verifyJWT, verifyRoleAccess(["author", "admin", "superadmin"]), deletePost);

router
  .route("/update-post/:postId")
  .put(verifyJWT, verifyRoleAccess(["author", "admin", "superadmin"]), upload.single("thumbnail"), updatePost);
=======
router.route("/delete-post/:postId").delete(verifyJWT, requireAuthor, deletePost);

router.route("/update-post/:postId").put(verifyJWT, requireAuthor, upload.single("thumbnail"), updatePost);
>>>>>>> 00dbadf2e6bf08ff9c8f137c95c1861007a2c99e

export default router;

