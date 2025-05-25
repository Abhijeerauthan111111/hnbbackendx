import express from "express";
import { 
  editProfile, 
  followOrUnfollow, 
  getProfile, 
  getSuggestedUsers, 
  login, 
  logout, 
  register, 
  sendOTP,
  forgotPassword,         
  verifyResetOTP,
  resetPassword,
  uploadResume,
  deleteResume
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

// Existing routes
router.route('/send-otp').post(sendOTP);
router.route('/register').post(register);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.route('/:id/profile').get(isAuthenticated, getProfile);
router.route('/profile/edit').post(isAuthenticated, upload.single('profilePhoto'), editProfile);
router.route('/suggested').get(isAuthenticated, getSuggestedUsers);
router.route('/followorunfollow/:id').post(isAuthenticated, followOrUnfollow);

// Password reset routes
router.route('/forgot-password').post(forgotPassword);
router.route('/verify-reset-otp').post(verifyResetOTP);
router.route('/reset-password').post(resetPassword);

// Resume routes
router.route('/resume/upload').post(isAuthenticated, upload.single('resume'), uploadResume);
router.route('/resume/delete').delete(isAuthenticated, deleteResume);

export default router;