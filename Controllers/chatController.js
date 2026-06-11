import mongoose from "mongoose";
import { Match } from "../models/matchModel.js";
import { chatSchema } from "../validators/zodSchema.js";
import { Chat } from "../models/chatModel.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const getChat = async (req, res) => {
  const { matchId } = req.params;
  const { cursor } = req.query;
  const limit = 25;

  const query = {
    matchId,
  };

  if (cursor) {
    query._id = {
      $lt: cursor,
    };
  }

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    status: "ACTIVE",
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "Failed to get match");
  }

  try {
    const chatData = await Chat.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("sender", "username avatar trustScore totalReviews");

    const hasMore = chatData.length > limit;

    if (hasMore) {
      chatData.pop();
    }

    const nextCursor = hasMore ? chatData[chatData.length - 1]._id : null;

    return successResponse(res, 200, "Chat fetched successfully", {
      chats: chatData.reverse(),
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to send your message");
  }
};

export const getChatHistories = async (req, res) => {
  const { matchId } = req.params;
  const { cursor } = req.query;
  const limit = 25;

  const query = {
    matchId,
  };

  if (cursor) {
    query._id = {
      $lt: cursor,
    };
  }

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const matchInfo = await Match.findOne({
    _id: matchId,
    status: { $in: ["COMPLETED", "CANCELLED"] },
    $or: [{ requester: req.user.id }, { accepter: req.user.id }],
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "Failed to get match");
  }

  try {
    const chatData = await Chat.find(query)
      .populate("sender", "username avatar trustScore totalReviews")
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = chatData.length > limit;

    if (hasMore) {
      chatData.pop();
    }

    const nextCursor = hasMore ? chatData[chatData.length - 1]._id : null;

    return successResponse(res, 200, "Chat histories fetched successfully", {
      chats: chatData.reverse(),
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to send your message");
  }
};
