import mongoose from "mongoose";
import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { Match } from "../models/matchModel.js";
import { exchangeRequestSchema } from "../validators/zodSchema.js";

//CREATE EXCHANGE REQUEST
export const createRequest = async (req, res) => {
  const existingExchangeReq = await ExchangeRequest.findOne({
    creator: req.user.id,
    status: { $in: ["ACTIVE", "MATCHED"] },
    expiresAt: { $gt: new Date() },
  });

  if (existingExchangeReq) {
    return res
      .status(400)
      .json({ error: "You already have a active or matched exchange request" });
  }

  const { success, data, error } = exchangeRequestSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }

  const { type, amount, radius, note, expiry } = data;

  try {
    const request = await ExchangeRequest.create({
      creator: req.user.id,
      type,
      amount,
      radius,
      note,
      expiresAt: new Date(Date.now() + 1000 * expiry * 60),
    });

    return res
      .status(200)
      .json({ info: "Exchange request created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create exchange request" });
  }
};

//CANCEL MY ACTIVE REQUEST
export const cancelRequest = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const existingExchangeReq = await ExchangeRequest.findOne({
    _id: requestId,
    creator: req.user.id,
    status: "ACTIVE",
  });

  if (!existingExchangeReq) {
    return res.status(400).json({ error: "You don't have an active request" });
  }

  if (existingExchangeReq.expiresAt < new Date()) {
    return res.status(400).json({ error: "This request is already expired" });
  }

  const matchInfo = await Match.findOne({
    request: requestId,
    status: { $in: ["PENDING", "ACTIVE"] },
  });

  if (matchInfo) {
    return res
      .status(403)
      .json({ error: "You can't cancel a matched request" });
  }

  try {
    await existingExchangeReq.updateOne({
      $set: {
        status: "CANCELLED",
      },
    });

    return res
      .status(200)
      .json({ info: "Exchange request cancelled successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to cancel exchange request" });
  }
};

//GETTING ACTIVE PUBLIC REQUESTS
export const getPublicRequests = async (req, res) => {
  try {
    const acceptedRequestIds = await Match.find({
      accepter: req.user.id,
      status: {
        $in: ["ACTIVE", "PENDING"],
      },
    }).distinct("request");

    const requests = await ExchangeRequest.find({
      creator: { $ne: req.user.id },
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
      _id: { $nin: acceptedRequestIds },
    });

    if (requests.length === 0) {
      return res.status(400).json({
        info: "Looks like no public requests there, please try after some time",
      });
    } else {
      res.status(200).json(requests);
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to get requests" });
  }
};

//GETTING ALL KINDS OF OWN REQUESTS
export const getMyRequests = async (req, res) => {
  try {
    const requests = await ExchangeRequest.find({
      creator: req.user.id,
    }).lean();

    if (requests.length === 0) {
      return res.status(400).json({ error: "You don't have any requests" });
    } else {
      const updatedReq = requests.map((elem) => {
        if (elem.expiresAt < new Date()) {
          return { ...elem, expired: true };
        } else {
          return { ...elem, expired: false };
        }
      });

      res.status(200).json(updatedReq);
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to get requests" });
  }
};
