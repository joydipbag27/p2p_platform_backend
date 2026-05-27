import express from "express";
import { emailLogin, emailRegister, getUser } from "../controllers/userController.js";
import { checkAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", emailRegister);
router.post("/login", emailLogin);
router.get("/", checkAuth, getUser)

export default router;
