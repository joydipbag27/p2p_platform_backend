import express from "express";
import {
  getNotifications,
  unreadNotification,
  unreadAllNotification,
  deleteNotifications,
  getUnreadcounter,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.delete("/", deleteNotifications);
router.patch("/unread/:id", unreadNotification);
router.patch("/unread-all", unreadAllNotification);
router.get("/unread-counter", getUnreadcounter)

export default router;
