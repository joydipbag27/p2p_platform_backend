import express from "express"
import { createReport, getReport } from "../controllers/reportController.js"


const router = express.Router()

router.post("/create", createReport)
router.get("/me", getReport)

export default router