import mongoose from "mongoose";
import { Match } from "../models/matchModel.js";
import { chatSchema } from "../validators/zodSchema.js";
import { Chat } from "../models/chatModel.js";
import { errorResponse, successResponse } from "../utils/response.js";


export const getChat = async (req, res) => {
  const { matchId } = req.params;

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
    const chatData = await Chat.find({ matchId })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 })
      .lean();

    return successResponse(res, 200, "Chat fetched successfully", chatData);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to send your message");
  }
};
