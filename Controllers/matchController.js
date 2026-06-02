import mongoose from "mongoose";
import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { Match } from "../models/matchModel.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { io } from "../app.js";

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
    const matchInfo = await Match.create({
      request: requestId,
      requester: exchangeReqInfo.creator,
      accepter: req.user.id,
      status: "PENDING",
      requesterConfirmed: false,
      accepterConfirmed: true,
    });

    io.to(`user:${exchangeReqInfo.creator}`).emit("newMatch", matchInfo);

    return successResponse(res, 200, "Match created successfully", matchInfo);
  } catch (error) {
    return errorResponse(res, 500, "Failed to create match");
  }
};

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

    io.to(`user:${matchInfo.accepter}`).emit(
      "confirmMatch",
      "Your match got confirmed by the requester",
    );

    return successResponse(res, 200, "Match confirmed successfully");
  } catch (error) {
    return errorResponse(res, 500, "Failed to confirm match");
  }
};

export const rejectMatch = async (req, res) => {
  const { matchId } = req.params;

  console.log(matchId);

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
  try {
    const updatedMatch = await Match.findOneAndUpdate(
      { _id: matchInfo._id },
      { $set: { status: "CANCELLED" } },
    );

    io.to(`user:${matchInfo.accepter}`).emit(
      "rejectMatch",
      "Your match got rejected by the requester",
    );

    return successResponse(res, 200, "Match rejected successfully");
  } catch (error) {
    return errorResponse(res, 500, "Failed to reject match");
  }
};

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

  let requester = false;
  if (matchInfo.requester.toString() === req.user.id.toString()) {
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

      io.to(`user:${matchInfo.accepter}`).emit("completeMatch", "2/2");
      io.to(`user:${matchInfo.requester}`).emit("completeMatch", "2/2");
    } else {
      io.to(`user:${matchInfo.accepter}`).emit("completeMatch", "1/2");
      io.to(`user:${matchInfo.requester}`).emit("completeMatch", "1/2");
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

  let requester = false;
  if (matchInfo.requester.toString() === req.user.id) {
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

    io.to(`user:${matchInfo.accepter}`).emit(
      "cancelActiveMatch",
      "Your transaction has cancelled successfully",
    );
  } else {
    matchUpdateQuery = {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        accepterCancelled: true,
      },
    };

    io.to(`user:${matchInfo.requester}`).emit(
      "cancelActiveMatch",
      "Your transaction has cancelled successfully",
    );
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
  const matchInfo = await Match.find({
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
    status: "ACTIVE",
  })
    .populate("requester", "username avatar trustScore")
    .populate("accepter", "username avatar trustScore")
    .populate("request");

  if (matchInfo.length === 0) {
    return errorResponse(res, 404, "No match found");
  }

  return successResponse(
    res,
    200,
    "Active matches fetched successfully",
    matchInfo,
  );
};

export const viewPendingMatch = async (req, res) => {
  const matchInfo = await Match.find({
    requester: req.user.id,
    status: "PENDING",
  })
    .populate("requester", "username avatar")
    .populate("accepter", "username avatar")
    .populate("request");

  if (matchInfo.length === 0) {
    return errorResponse(res, 404, "No match found");
  }

  return successResponse(
    res,
    200,
    "Active matches fetched successfully",
    matchInfo,
  );
};
