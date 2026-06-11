import { Notification } from "../models/notificationModel.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const getNotifications = async (req, res) => {
  const { cursor } = req.query;
  const limit = 10;

  const query = {
    userId: req.user.id,
  };

  if (cursor) {
    query._id = {
      $lt: cursor,
    };
  }

  try {
    const notificationData = await Notification.find(query)
      .sort({
        _id: -1,
      })
      .limit(limit + 1)
      .lean();

    if (notificationData.length === 0) {
      return successResponse(res, 200, "You have no new notifications");
    }
    const hasMore = notificationData.length > limit;

    if (hasMore) {
      notificationData.pop();
    }

    const nextCursor = hasMore
      ? notificationData[notificationData.length - 1]._id
      : null;

    return successResponse(res, 200, "Notification fetched successfully", {
      notifications: notificationData,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    return errorResponse(res, 500, "Failed to get notifications");
  }
};

export const unreadNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notificationInfo = await Notification.findByIdAndUpdate(id, {
      $set: { isRead: true },
    });

    return successResponse(
      res,
      200,
      "Notification marked as read successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Failed to mark as read");
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

    return successResponse(
      res,
      200,
      "Notifications marked as read successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Failed to mark as read");
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      userId: req.user.id,
    });

    return successResponse(res, 200, "Notifications deleted successfully");
  } catch (error) {
    return errorResponse(res, 500, "Failed to delete notifications");
  }
};

export const getUnreadcounter = async (req, res) => {
  try {
    const unreadCounter = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    return successResponse(res, 200, "Unread counter fetched successfully", {
      unreadCounter,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Failed to get notification counter");
  }
};
