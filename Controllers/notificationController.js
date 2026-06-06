import { Notification } from "../models/notificationModel.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort(
      {
        createdAt: -1,
      },
    );

    if (notifications.length === 0) {
      successResponse(res, 200, "You have no new notifications");
    }

    successResponse(
      res,
      200,
      "Notification fetched successfully",
      notifications,
    );
  } catch (error) {
    errorResponse(res, 500, "Failed to get notifications");
  }
};

export const unreadNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notificationInfo = await Notification.findByIdAndUpdate(id, {
      $set: { isRead: true },
    });

    successResponse(res, 200, "Notification marked as read successfully");
  } catch (error) {
    errorResponse(res, 500, "Failed to mark as read");
  }
};

export const unreadAllNotification = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id },
      {
        $set: { isRead: true },
      },
    );

    successResponse(res, 200, "Notifications marked as read successfully");
  } catch (error) {
    errorResponse(res, 500, "Failed to mark as read");
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      userId: req.user.id,
    });

    successResponse(res, 200, "Notifications deleted successfully");
  } catch (error) {
    errorResponse(res, 500, "Failed to delete notifications");
  }
};
