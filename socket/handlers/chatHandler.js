import mongoose from "mongoose";
import { Match } from "../../models/matchModel.js";
import { Chat } from "../../models/chatModel.js";

export const registerChatHandler = (io, socket) => {
  socket.on("joinRoom", async (matchId, callback) => {
    if (!mongoose.isValidObjectId(matchId)) {
      return callback({
        success: false,
        error: "Invalid match id",
      });
    }

    try {
      const matchInfo = await Match.findById(matchId);

      if (!matchInfo) {
        return callback({
          success: false,
          error: "Match info doesn't exists",
        });
      }


      if (
        matchInfo.requester.toString() === socket.user.id.toString() ||
        matchInfo.accepter.toString() === socket.user.id.toString()
      ) {
        socket.join(matchId);
        callback({
          success: true,
        });
      } else {
        return callback({
          success: false,
          error: "This match doesn't belongs to you",
        });
      }
    } catch (error) {
      callback({
        success: false,
        error: "Unable to join room",
      });
    }
  });
};

export const sendMessage = (io, socket) => {
  socket.on("sendMessage", async (data, callback) => {
    try {
      const { matchId, message } = data;

      if (!mongoose.isValidObjectId(matchId)) {
        return callback({
          success: false,
          error: "Invalid match id",
        });
      }

      if (!message?.trim()) {
        return callback({
          success: false,
          error: "Message is required",
        });
      }

      const matchInfo = await Match.findById(matchId);

      if (!matchInfo) {
        return callback({
          success: false,
          error: "Match not found",
        });
      }

      if (
        matchInfo.requester.toString() === socket.user.id.toString() ||
        matchInfo.accepter.toString() === socket.user.id.toString()
      ) {
      } else {
        return callback({
          success: false,
          error: "Unauthorized",
        });
      }

      const chat = await Chat.create({
        matchId,
        sender: socket.user.id,
        message: message.trim(),
      });

      io.to(matchId).emit("newMessage", chat);

      return callback({
        success: true,
        message: chat,
      });
    } catch (error) {
      callback({
        success: false,
        error: "Unable to send message",
      });
    }
  });
};
