import express from "express"
import { createChat, getChat } from "../controllers/chatController.js"

const router = express.Router()

router.post("/create/:matchId", createChat)
router.get("/:matchId" , getChat)

export default router