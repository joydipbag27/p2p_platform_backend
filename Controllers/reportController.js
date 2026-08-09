import { errorResponse, successResponse } from "../utils/response.js";
import { createReportSchema } from "../validators/zodSchema.js";
import { User } from "../models/userModel.js";
import { Match } from "../models/matchModel.js";
import { Report } from "../models/reportModel.js";
import { Notification } from "../models/notificationModel.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TITLES,
} from "../config/notificationTypes.js";

export const createReport = async (req, res) => {
  const { success, data, error } = createReportSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { reportedUserId, matchId, reason, description } = data;

  const reportedUserInfo = await User.findById(reportedUserId);

  if (!reportedUserInfo) {
    return errorResponse(res, 400, "Reported user not found");
  }

  const matchInfo = await Match.findById(matchId);

  if (!matchInfo) {
    return errorResponse(res, 400, "Match not found");
  }

  const existingReport = await Report.findOne({
    reporter: req.user.id,
    matchId,
  });

  if (existingReport) {
    return errorResponse(res, 400, "You already reported this transaction");
  }

  try {
    await Report.create({
      reporter: req.user.id,
      reportedUser: reportedUserId,
      matchId,
      reason,
      description,
    });

    //NOTIFICATION
    await Notification.create({
      userId: req.user.id,
      type: NOTIFICATION_TYPES.REPORTED_SUCCESFULLY,
      title: NOTIFICATION_TITLES.REPORTED_SUCCESFULLY,
      message: `Your report has been successfully created`,
      metaData: {
        matchId,
      },
    });

    return successResponse(res, 200, "Report created succesfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to create report");
  }
};

export const getReport = async (req, res) => {
  try {
    const reportsInfo = await Report.find({
      reporter: req.user.id,
    }).populate("reportedUser", "avatar username trustScore totalReviews");

    return successResponse(res, 200, "Reports fetched successfully", {
      reports: reportsInfo,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to get reports");
  }
};
