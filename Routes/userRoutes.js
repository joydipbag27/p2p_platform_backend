import express from "express";
import {
  changePassword,
  emailLogin,
  emailRegister,
  forgotPass,
  getOthersProfile,
  getUser,
  logout,
  passwordStatus,
  setNewPass,
} from "../controllers/userController.js";
import { checkAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", emailRegister);
router.post("/login", emailLogin);
router.post("/forgot-password", forgotPass)
router.get("/", checkAuth, getUser);
router.get("/profile/:userId", checkAuth, getOthersProfile);
router.post("/logout", checkAuth, logout)
router.get("/password-status", checkAuth, passwordStatus)
router.post("/set-password", checkAuth, setNewPass)
router.post("/change-password", checkAuth, changePassword)


export default router;
