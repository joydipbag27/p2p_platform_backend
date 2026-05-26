import express from "express";
import { emailLogin, emailRegister, getUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", emailRegister);
router.post("/login", emailLogin);
router.get("/", getUser)

export default router;
