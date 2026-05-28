import mongoose from "mongoose";
import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { Match } from "../models/matchModel.js";
import { exchangeRequestSchema } from "../validators/zodSchema.js";
import { errorResponse, successResponse } from "../utils/response.js";

//CREATE EXCHANGE REQUEST
export const createRequest = async (req, res) => {
  const existingExchangeReq = await ExchangeRequest.findOne({
    creator: req.user.id,
    status: { $in: ["ACTIVE", "MATCHED"] },
    expiresAt: { $gt: new Date() },
  });

  if (existingExchangeReq) {
    return errorResponse(
      res,
      400,
      "You already have a active or matched exchange request",
    );
  }

  const { success, data, error } = exchangeRequestSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
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

    return res;

    return successResponse(res, 200, "Exchange request created successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to create exchange request");
  }
};

//CANCEL MY ACTIVE REQUEST
export const cancelRequest = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const existingExchangeReq = await ExchangeRequest.findOne({
    _id: requestId,
    creator: req.user.id,
    status: "ACTIVE",
  });

  if (!existingExchangeReq) {
    return errorResponse(res, 400, "You don't have an active request");
  }

  if (existingExchangeReq.expiresAt < new Date()) {
    return errorResponse(res, 400, "This request is already expired");
  }

  const matchInfo = await Match.findOne({
    request: requestId,
    status: { $in: ["PENDING", "ACTIVE"] },
  });

  if (matchInfo) {
    return errorResponse(res, 403, "You can't cancel a matched request");
  }

  try {
    await existingExchangeReq.updateOne({
      $set: {
        status: "CANCELLED",
      },
    });

    return successResponse(res, 200, "Exchange request cancelled successfully");
  } catch (error) {
    console.error(error);

    return errorResponse(res, 500, "Failed to cancel exchange request");
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
      return errorResponse(
        res,
        400,
        "Looks like no public requests there, please try after some time",
      );
    } else {
      return successResponse(
        res,
        200,
        "Public requests fetched successfully",
        requests,
      );
    }
  } catch (error) {
    return errorResponse(res, 500, "Failed to get requests");
  }
};

//GETTING ALL KINDS OF OWN REQUESTS
export const getMyRequests = async (req, res) => {
  try {
    const requests = await ExchangeRequest.find({
      creator: req.user.id,
    }).lean();

    if (requests.length === 0) {
      return errorResponse(res, 400, "You don't have any requests");
    } else {
      const updatedReq = requests.map((elem) => {
        if (elem.expiresAt < new Date()) {
          return { ...elem, expired: true };
        } else {
          return { ...elem, expired: false };
        }
      });

      return successResponse(
        res,
        200,
        "Own requests fetched successfully",
        updatedReq,
      );
    }
  } catch (error) {
    return errorResponse(res, 400, "Failed to get requests");
  }
};
