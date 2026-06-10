import express from "express";
import { getChat, getChatHistories } from "../controllers/chatController.js";

const router = express.Router();

router.get("/:matchId", getChat);
router.get("/history/:matchId", getChatHistories);

export default router;
