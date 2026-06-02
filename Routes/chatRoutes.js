import express from "express"
import {  getChat } from "../controllers/chatController.js"

const router = express.Router()


router.get("/:matchId" , getChat)

export default router