import express from "express";
import { emailLogin, emailRegister } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", emailRegister);
router.post("/login", emailLogin);

export default router;
