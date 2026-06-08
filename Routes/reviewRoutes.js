import express from "express"
import { createReview, getOwnReviews, getReviews } from "../controllers/reviewController.js"

const router = express.Router()

router.post("/", createReview)
router.get("/user/:userId", getReviews)
router.get("/me", getOwnReviews)


export default router