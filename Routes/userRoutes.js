import express from "express";
import {
  emailLogin,
  emailRegister,
  getOthersProfile,
  getUser,
  logout,
  sendOtp,
  verifyOtp,
} from "../controllers/userController.js";
import { checkAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", emailRegister);
router.post("/login", emailLogin);
router.get("/", checkAuth, getUser);
router.get("/profile/:userId", checkAuth, getOthersProfile);
router.post("/logout", checkAuth, logout)
router.post("/send-otp", sendOtp)
router.post("/verify-otp", verifyOtp)

export default router;
