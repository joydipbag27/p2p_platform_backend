import mongoose from "mongoose";
import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { Match } from "../models/matchModel.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { io } from "../app.js";
import { User } from "../models/userModel.js";
import {
  NOTIFICATION_TITLES,
  NOTIFICATION_TYPES,
} from "../config/notificationTypes.js";
import { Notification } from "../models/notificationModel.js";

//OFFER CREATED BY A USER
export const createMatch = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const existingWorkflow = await Match.findOne({
    accepter: req.user.id,
    status: { $in: ["PENDING", "ACTIVE"] },
  });

  if (existingWorkflow) {
    return errorResponse(
      res,
      400,
      "You already have a pending or active match",
    );
  }

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: requestId,
    creator: { $ne: req.user.id },
    status: "ACTIVE",
  });

  if (!exchangeReqInfo) {
    return errorResponse(res, 400, "Failed to get request info");
  }

  if (exchangeReqInfo.expiresAt < new Date()) {
    return errorResponse(res, 400, "This request is already expired");
  }

  const activeMatch = await Match.findOne({
    request: requestId,
    status: "ACTIVE",
  });

  if (activeMatch) {
    return errorResponse(res, 400, "This request already has an active match");
  }

  try {
    const matchId = new mongoose.Types.ObjectId();

    const matchInfo = await Match.create({
      _id: matchId,
      request: requestId,
      requester: exchangeReqInfo.creator,
      accepter: req.user.id,
      status: "PENDING",
      requesterConfirmed: false,
      accepterConfirmed: true,
    });

    //SOCKET
    io.to(`user:${exchangeReqInfo.creator}`).emit("newMatch", {
      match: matchInfo,
    });

    //NOTIFICATION
    await Notification.create({
      userId: exchangeReqInfo.creator,
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      title: NOTIFICATION_TITLES.OFFER_RECEIVED,
      message: `${req.user.username} offered to help with your ₹${exchangeReqInfo.amount} request`,
      metaData: {
        requestId,
        matchId,
      },
    });

    return successResponse(res, 200, "Match created successfully", matchInfo);
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Failed to create match");
  }
};

//OFFER ACCEPTED
export const confirmMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    requester: req.user.id,
    accepterConfirmed: true,
    status: "PENDING",
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "Failed to get your match");
  }

  if (matchInfo.requesterConfirmed) {
    return errorResponse(res, 400, "Match already confirmed");
  }

  const exchangeReqInfo = await ExchangeRequest.findById(matchInfo.request);

  if (!exchangeReqInfo) {
    return errorResponse(res, 400, "Failed to get exchange request");
  }

  try {
    //SETTING ACTIVE
    const updatedMatch = await Match.findByIdAndUpdate(
      { _id: matchInfo._id },
      { $set: { requesterConfirmed: true, status: "ACTIVE" } },
    );

    //SETTING OTHERS CANCELLED
    await Match.updateMany(
      {
        request: matchInfo.request,
        _id: { $ne: matchId },
        status: "PENDING",
      },
      { $set: { status: "CANCELLED" } },
    );

    await ExchangeRequest.findOneAndUpdate(
      { _id: matchInfo.request },
      { $set: { status: "MATCHED" } },
      { $unset: { expiresAt: 1 } },
    );

    //SOCKET
    io.to(`user:${matchInfo.accepter}`).emit("confirmMatch", {
      matchId,
      success: true,
    });

    io.to("public-room").emit("requestCancelled", {
      requestId: matchInfo.request,
    });

    //NOTIFICATION
    await Notification.create({
      userId: matchInfo.accepter,
      type: NOTIFICATION_TYPES.OFFER_ACCEPTED,
      title: NOTIFICATION_TITLES.OFFER_ACCEPTED,
      message: `Your offer for ₹${exchangeReqInfo.amount} has been accepted. You can now start chatting`,
      metaData: {
        matchId,
      },
    });

    return successResponse(res, 200, "Match confirmed successfully");
  } catch (error) {
    return errorResponse(res, 500, "Failed to confirm match");
  }
};

//OFFER REJECTED
export const rejectMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, "Failed to confirm match");
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    requester: req.user.id,
    accepterConfirmed: true,
    status: "PENDING",
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "Failed to get match");
  }

  if (matchInfo.requesterConfirmed) {
    return errorResponse(res, 404, "Match already confirmed");
  }

  const exchangeReqInfo = await ExchangeRequest.findById(matchInfo.request);

  if (!exchangeReqInfo) {
    return errorResponse(res, 400, "Failed to get exchange request");
  }

  try {
    const updatedMatch = await Match.findOneAndUpdate(
      { _id: matchInfo._id },
      { $set: { status: "CANCELLED" } },
    );

    //SOCKET
    io.to(`user:${matchInfo.accepter}`).emit("rejectMatch", {
      matchId,
      success: true,
    });

    //NOTIFICATION
    await Notification.create({
      userId: matchInfo.accepter,
      type: NOTIFICATION_TYPES.OFFER_REJECTED,
      title: NOTIFICATION_TITLES.OFFER_REJECTED,
      message: `Your offer for ₹${exchangeReqInfo.amount} was declined`,
      metaData: {
        matchId,
      },
    });

    return successResponse(res, 200, "Match rejected successfully");
  } catch (error) {
    return errorResponse(res, 500, "Failed to reject match");
  }
};

//SWAP COMPLETED
export const completeMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
    requesterConfirmed: true,
    accepterConfirmed: true,
    status: "ACTIVE",
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "You don't have an active match");
  }

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: matchInfo.request,
    status: "MATCHED",
  });

  if (!exchangeReqInfo) {
    return errorResponse(res, 400, "You don't have a matched exchange request");
  }

  const userId = (req.user.id._id || req.user.id).toString();
  let requester = false;
  if (matchInfo.requester.toString() === userId) {
    requester = true;
  }

  //DOUBLE COMPLETION CHECK
  if (requester && matchInfo.requesterCompleted) {
    return errorResponse(res, 403, "You already completed this match");
  } else if (!requester && matchInfo.accepterCompleted) {
    return errorResponse(res, 403, "You already completed this match");
  }

  //CANCELLED MATCH COMPLETION CHECK
  if (requester && matchInfo.requesterCancelled) {
    return errorResponse(res, 403, "You already cancelled this match");
  } else if (!requester && matchInfo.accepterCancelled) {
    return errorResponse(res, 403, "You already cancelled this match");
  }

  let matchUpdateQuery = {};
  if (requester) {
    matchUpdateQuery = {
      $set: {
        completedAt: new Date(),
        requesterCompleted: true,
      },
    };
  } else {
    matchUpdateQuery = {
      $set: {
        completedAt: new Date(),
        accepterCompleted: true,
      },
    };
  }
  try {
    await matchInfo.updateOne(matchUpdateQuery);

    const refreshedMatch = await Match.findById(matchId);

    if (refreshedMatch.accepterCompleted && refreshedMatch.requesterCompleted) {
      await matchInfo.updateOne({ status: "COMPLETED" });

      await exchangeReqInfo.updateOne({
        $set: { status: "COMPLETED", completedAt: new Date() },
      });

      io.to(`user:${matchInfo.accepter}`).emit("completeMatch", {
        matchId,
        completedCount: 2,
        totalCount: 2,
      });
      io.to(`user:${matchInfo.requester}`).emit("completeMatch", {
        matchId,
        completedCount: 2,
        totalCount: 2,
      });

      //NOTIFICATION
      await Notification.create({
        userId: matchInfo.accepter,
        type: NOTIFICATION_TYPES.SWAP_COMPLETED,
        title: NOTIFICATION_TITLES.SWAP_COMPLETED,
        message: `Your ₹${exchangeReqInfo.amount} swap has been completed successfully`,
        metaData: {
          matchId,
        },
      });

      await Notification.create({
        userId: matchInfo.requester,
        type: NOTIFICATION_TYPES.SWAP_COMPLETED,
        title: NOTIFICATION_TITLES.SWAP_COMPLETED,
        message: `Your ₹${exchangeReqInfo.amount} swap has been completed successfully`,
        metaData: {
          matchId,
        },
      });
    } else {
      io.to(`user:${matchInfo.accepter}`).emit("completeMatch", {
        matchId,
        completedCount: 1,
        totalCount: 2,
      });
      io.to(`user:${matchInfo.requester}`).emit("completeMatch", {
        matchId,
        completedCount: 1,
        totalCount: 2,
      });

      //NOTIFICATION
      await Notification.create({
        userId: matchInfo.accepter,
        type: NOTIFICATION_TYPES.SWAP_COMPLETED,
        title: NOTIFICATION_TITLES.SWAP_COMPLETED,
        message: `Your ₹${exchangeReqInfo.amount} swap has been partially completed`,
        metaData: {
          matchId,
        },
      });

      await Notification.create({
        userId: matchInfo.requester,
        type: NOTIFICATION_TYPES.SWAP_COMPLETED,
        title: NOTIFICATION_TITLES.SWAP_COMPLETED,
        message: `Your ₹${exchangeReqInfo.amount} swap has been partially completed`,
        metaData: {
          matchId,
        },
      });
    }

    return successResponse(
      res,
      200,
      "Your transaction has completed successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Failed to complete your transaction");
  }
};

//SWAP MARKED AS CANCELLED
export const cancelActiveMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
    requesterConfirmed: true,
    accepterConfirmed: true,
    status: "ACTIVE",
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "You don't have an active match");
  }

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: matchInfo.request,
    status: "MATCHED",
  });

  if (!exchangeReqInfo) {
    return errorResponse(res, 400, "You don't have a matched exchange request");
  }

  const userId = (req.user.id._id || req.user.id).toString();
  let requester = false;
  if (matchInfo.requester.toString() === userId) {
    requester = true;
  }

  //DOUBLE CANCELLATION CHECK
  if (requester && matchInfo.requesterCompleted) {
    return errorResponse(res, 403, "You already completed this match");
  } else if (!requester && matchInfo.accepterCompleted) {
    return errorResponse(res, 403, "You already completed this match");
  }

  //CANCELLED MATCH COMPLETION CHECK
  if (requester && matchInfo.requesterCancelled) {
    return errorResponse(res, 403, "You already cancelled this match");
  } else if (!requester && matchInfo.accepterCancelled) {
    return errorResponse(res, 403, "You already cancelled this match");
  }

  let matchUpdateQuery = {};
  if (requester) {
    matchUpdateQuery = {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        requesterCancelled: true,
      },
    };

    io.to(`user:${matchInfo.accepter}`).emit("cancelActiveMatch", {
      matchId,
      success: true,
    });

    //NOTIFICATION
    await Notification.create({
      userId: matchInfo.accepter,
      type: NOTIFICATION_TYPES.OFFER_REJECTED,
      title: NOTIFICATION_TITLES.OFFER_REJECTED,
      message: `The ongoing swap was cancelled `,
      metaData: {
        matchId,
      },
    });
  } else {
    matchUpdateQuery = {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        accepterCancelled: true,
      },
    };

    io.to(`user:${matchInfo.requester}`).emit("cancelActiveMatch", {
      matchId,
      success: true,
    });

    //NOTIFICATION
    await Notification.create({
      userId: matchInfo.requester,
      type: NOTIFICATION_TYPES.OFFER_REJECTED,
      title: NOTIFICATION_TITLES.OFFER_REJECTED,
      message: `The ongoing swap was cancelled`,
      metaData: {
        matchId,
      },
    });
  }
  try {
    await matchInfo.updateOne(matchUpdateQuery);

    await exchangeReqInfo.updateOne({
      $set: { status: "CANCELLED", cancelledAt: new Date() },
    });

    return successResponse(
      res,
      200,
      "Your transaction has cancelled successfully",
    );
  } catch (error) {
    return errorResponse(res, 500, "Failed to cancel your transaction");
  }
};

export const viewActiveMatch = async (req, res) => {
  try {
    const matchInfo = await Match.find({
      $or: [{ requester: req.user.id }, { accepter: req.user.id }],
      status: "ACTIVE",
    })
      .populate("requester", "username avatar trustScore")
      .populate("accepter", "username avatar trustScore")
      .populate("request");

    if (matchInfo.length === 0) {
      return successResponse(res, 200, "No active match found");
    }

    return successResponse(
      res,
      200,
      "Active matches fetched successfully",
      matchInfo,
    );
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch active matches");
  }
};

export const viewPendingMatch = async (req, res) => {
  try {
    const matchInfo = await Match.find({
      requester: req.user.id,
      status: "PENDING",
    })
      .populate("requester", "username avatar")
      .populate("accepter", "username avatar")
      .populate("request");

    if (matchInfo.length === 0) {
      return successResponse(res, 200, "No pending match found");
    }

    return successResponse(
      res,
      200,
      "Active matches fetched successfully",
      matchInfo,
    );
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch pending matches");
  }
};

export const viewMatchHistory = async (req, res) => {
  try {
    const matchInfo = await Match.find({
      $or: [{ requester: req.user.id }, { accepter: req.user.id }],
      status: { $in: ["COMPLETED", "CANCELLED"] },
    })
      .populate("requester", "username avatar")
      .populate("accepter", "username avatar")
      .populate("request");

    if (matchInfo.length === 0) {
      return successResponse(res, 200, "No history found", []);
    }

    return successResponse(
      res,
      200,
      "Matches history fetched successfully",
      matchInfo,
    );
  } catch (error) {
    return errorResponse(res, 500, "Failed to fetch match history");
  }
};


