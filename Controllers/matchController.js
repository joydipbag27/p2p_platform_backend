import mongoose from "mongoose";
import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { Match } from "../models/matchModel.js";

export const createMatch = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const existingWorkflow = await Match.findOne({
    accepter: req.user.id,
    status: { $in: ["PENDING", "ACTIVE"] },
  });

  if (existingWorkflow) {
    return res
      .status(400)
      .json({ error: "You already have a pending or active match" });
  }

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: requestId,
    creator: { $ne: req.user.id },
    status: "ACTIVE",
  });

  if (!exchangeReqInfo) {
    return res.status(400).json({ error: "Failed to get request info" });
  }

  if (exchangeReqInfo.expiresAt < new Date()) {
    return res.status(400).json({ error: "This request is already expired" });
  }

  const activeMatch = await Match.findOne({
    request: requestId,
    status: "ACTIVE",
  });

  if (activeMatch) {
    return res.status(400).json({
      error: "This request already has an active match",
    });
  }

  const matchInfo = await Match.create({
    request: requestId,
    requester: exchangeReqInfo.creator,
    accepter: req.user.id,
    status: "PENDING",
    requesterConfirmed: false,
    accepterConfirmed: true,
  });

  res.json(matchInfo);
};

export const confirmMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    requester: req.user.id,
    accepterConfirmed: true,
    status: "PENDING",
  });

  if (!matchInfo) {
    return res.status(404).json({ error: "Failed to get your match" });
  }

  if (matchInfo.requesterConfirmed) {
    return res.status(404).json({ error: "Match already confirmed" });
  }

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

  res.status(200).json({ info: "Match confirmed successfully" });
};

export const rejectMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    requester: req.user.id,
    accepterConfirmed: true,
    status: "PENDING",
  });

  if (!matchInfo) {
    return res.status(404).json({ error: "Failed to get match" });
  }

  if (matchInfo.requesterConfirmed) {
    return res.status(404).json({ error: "Match already confirmed" });
  }

  const updatedMatch = await Match.findOneAndUpdate(
    { _id: matchInfo._id },
    { $set: { status: "CANCELLED" } },
  );

  res.status(200).json({ info: "Match rejected successfully" });
};

export const completeMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
    requesterConfirmed: true,
    accepterConfirmed: true,
    status: "ACTIVE",
  });

  if (!matchInfo) {
    return res.status(400).json({ error: "You don't have an active match" });
  }

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: matchInfo.request,
    status: "MATCHED",
  });

  if (!exchangeReqInfo) {
    return res
      .status(400)
      .json({ error: "You don't have a matched exchange request" });
  }

  let requester = false;
  if (matchInfo.requester.toString() === req.user.id.toString()) {
    requester = true;
  }

  console.log(requester);

  //DOUBLE COMPLETION CHECK
  if (requester && matchInfo.requesterCompleted) {
    return res.status(403).json({ error: "You already completed this match" });
  } else if (!requester && matchInfo.accepterCompleted) {
    return res.status(403).json({ error: "You already completed this match" });
  }

  //CANCELLED MATCH COMPLETION CHECK
  if (requester && matchInfo.requesterCancelled) {
    return res.status(403).json({ error: "You already cancelled this match" });
  } else if (!requester && matchInfo.accepterCancelled) {
    return res.status(403).json({ error: "You already cancelled this match" });
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

  await matchInfo.updateOne(matchUpdateQuery);

  const refreshedMatch = await Match.findById(matchId);

  if (refreshedMatch.accepterCompleted && refreshedMatch.requesterCompleted) {
    await matchInfo.updateOne({ status: "COMPLETED" });

    await exchangeReqInfo.updateOne({
      $set: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  res.status(200).json({ info: "Your transaction has completed successfully" });
};

export const cancelActiveMatch = async (req, res) => {
  const { matchId } = req.params;

  if (!mongoose.isValidObjectId(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
    requesterConfirmed: true,
    accepterConfirmed: true,
    status: "ACTIVE",
  });

  if (!matchInfo) {
    return res.status(400).json({ error: "You don't have an active match" });
  }

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: matchInfo.request,
    status: "MATCHED",
  });

  if (!exchangeReqInfo) {
    return res
      .status(400)
      .json({ error: "You don't have a matched exchange request" });
  }

  let requester = false;
  if (matchInfo.requester.toString() === req.user.id) {
    requester = true;
  }

  //DOUBLE CANCELLATION CHECK
  if (requester && matchInfo.requesterCompleted) {
    return res.status(403).json({ error: "You already completed this match" });
  } else if (!requester && matchInfo.accepterCompleted) {
    return res.status(403).json({ error: "You already completed this match" });
  }

  //CANCELLED MATCH COMPLETION CHECK
  if (requester && matchInfo.requesterCancelled) {
    return res.status(403).json({ error: "You already cancelled this match" });
  } else if (!requester && matchInfo.accepterCancelled) {
    return res.status(403).json({ error: "You already cancelled this match" });
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
  } else {
    matchUpdateQuery = {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        accepterCancelled: true,
      },
    };
  }

  await matchInfo.updateOne(matchUpdateQuery);

  await exchangeReqInfo.updateOne({
    $set: { status: "CANCELLED", cancelledAt: new Date() },
  });

  res.status(200).json({ info: "Your transaction has cancelled successfully" });
};

export const viewActiveMatch = async (req, res) => {
  const matchInfo = await Match.find({
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
    status: "ACTIVE",
  });

  if (matchInfo.length === 0) {
    return res.status(404).json({ error: "No match found" });
  }

  res.status(200).json(matchInfo);
};

export const viewPendingMatch = async (req, res) => {
  const matchInfo = await Match.find({
    requester: req.user.id,
    status: "PENDING",
  });

  if (matchInfo.length === 0) {
    return res.status(404).json({ error: "No match found" });
  }

  res.status(200).json(matchInfo);
};
