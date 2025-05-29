import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { addComment, addNewPost, bookmarkPost, deleteComment, deletePost, dislikePost, getAllPost, getAllPosts, getCommentsOfPost, getUserPost, getUserPostsById, likePost } from "../controllers/post.controller.js";


const router = express.Router();

router.route("/addpost").post(isAuthenticated, upload.single('image'), addNewPost);
router.route("/all").get(isAuthenticated,getAllPost);
// router.route("/allpost").get(isAuthenticated,getAllPosts);
router.route("/userpost/all").get(isAuthenticated, getUserPost);
router.route("/user/:userId").get(isAuthenticated, getUserPostsById);

router.route("/:id/like").get(isAuthenticated, likePost);
router.route("/:id/dislike").get(isAuthenticated, dislikePost);
router.route("/:id/comment").post(isAuthenticated, addComment); 
router.route("/:id/comment/:commentId").delete(isAuthenticated, deleteComment); //
router.route("/:id/comment/all").post(isAuthenticated, getCommentsOfPost);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/:id/bookmark").get(isAuthenticated, bookmarkPost);

export default router;
