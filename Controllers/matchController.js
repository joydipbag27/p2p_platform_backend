import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { Match } from "../models/matchModel.js";

//if b accept the request of a
export const createMatch = async (req, res) => {
  const { requestId } = req.params;

  const exchangeReqInfo = await ExchangeRequest.findOne({
    _id: requestId,
    creator: { $ne: req.user.id },
    status: "ACTIVE",
  });

  if (!exchangeReqInfo) {
    return res.status(400).json({ error: "Failed to get request info" });
  }

  const existingMatch = await Match.findOne({
    request: requestId,
    status: {
      $in: ["ACTIVE", "PENDING"],
    },
  });

  if (existingMatch) {
    return res.status(400).json({ error: "This request is already matched" });
  }

  //accepter is b here
  const matchInfo = await Match.create({
    request: requestId,
    requester: exchangeReqInfo.creator,
    accepter: req.user.id,
    status: "PENDING",
    requesterConfirmed: false,
    accepterConfirmed: true,
  });

  await exchangeReqInfo.updateOne({
    $set: { status: "PENDING_MATCH" },
    $unset: { expiresAt: 1 },
  });

  res.json(matchInfo);
};

export const viewMatch = async (req, res) => {
  const matchInfo = await Match.findOne({
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
  });

  if (!matchInfo) {
    return res.status(404).json({ error: "No match found" });
  }

  res.status(200).json(matchInfo);
};

export const confirmMatch = async (req, res) => {
  const matchInfo = await Match.findOne({
    requester: req.user.id,
    accepterConfirmed: true,
    requesterConfirmed: false,
  });

  if (!matchInfo) {
    return res.status(404).json({ error: "Match already confirmed" });
  }

  const updatedMatch = await Match.findByIdAndUpdate(
    { _id: matchInfo._id },
    { $set: { requesterConfirmed: true, status: "ACTIVE" } },
  );

  await ExchangeRequest.findOneAndUpdate(
    { _id: matchInfo.request },
    { $set: { status: "MATCHED" }, $unset: { expiresAt: 1 } },
  );

  res.status(200).json({ info: "Match confirmed successfully" });
};

export const rejectMatch = async (req, res) => {
  const matchInfo = await Match.findOne({
    requester: req.user.id,
    accepterConfirmed: true,
    requesterConfirmed: false,
  });

  if (!matchInfo) {
    return res.status(404).json({ error: "Match already confirmed" });
  }

  const updatedMatch = await Match.findOneAndUpdate(
    { _id: matchInfo._id },
    { $set: { requesterConfirmed: true, status: "CANCELLED" } },
  );

  await ExchangeRequest.findOneAndUpdate(
    { _id: matchInfo.request },
    {
      $set: {
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    },
  );

  res.status(200).json({ info: "Match rejected successfully" });
};
