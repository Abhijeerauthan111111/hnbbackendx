import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { 
  addEventComment, 
  addNewEvent, 
  deleteEvent, 
  getAllEvents, 
  getEventComments, 
  isFaculty, 
  likeEvent, 
  unlikeEvent 
} from "../controllers/event.controller.js";

const router = express.Router();

// Changed from /addevent to /add to match frontend
router.post("/add", isAuthenticated, isFaculty, upload.single('image'), addNewEvent);
router.get("/all", isAuthenticated, getAllEvents);
router.delete("/:id", isAuthenticated, deleteEvent);

router.get("/:id/like", isAuthenticated, likeEvent);
router.get("/:id/dislike", isAuthenticated, unlikeEvent);
router.post("/:id/comment", isAuthenticated, addEventComment);
router.get("/:id/comments", isAuthenticated, getEventComments);

export default router;