import express from "express"
import { loginWithGoogle, sendOtp, verifyOtp } from "../controllers/authController.js"

const router = express.Router()


router.post("/google", loginWithGoogle)
router.post("/send-otp", sendOtp)
router.post("/verify-otp", verifyOtp)


export default router