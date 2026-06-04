import mongoose from "mongoose";
import { Match } from "../../models/matchModel.js";
import { Chat } from "../../models/chatModel.js";
import { is } from "zod/locales";

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

        const room = io.sockets.adapter.rooms.get(matchId);

        console.log("ROOM:", room);
        console.log("ROOM SIZE:", room?.size);

        if (matchInfo.requester.toString() === socket.user.id.toString()) {
          await Match.findByIdAndUpdate(matchId, {
            $set: { requesterUnread: 0 },
          });
        } else if (
          matchInfo.accepter.toString() === socket.user.id.toString()
        ) {
          await Match.findByIdAndUpdate(matchId, {
            $set: { accepterUnread: 0 },
          });
        }
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

  socket.on("leaveRoom", (matchId) => {
    socket.leave(matchId);

    const room = io.sockets.adapter.rooms.get(matchId);

    console.log("ROOM:", room);
    console.log("ROOM SIZE:", room?.size);
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

      const isParticipant =
        matchInfo.requester.toString() === socket.user.id.toString() ||
        matchInfo.accepter.toString() === socket.user.id.toString();

      if (!isParticipant) {
        return callback({
          success: false,
          error: "Unauthorized",
        });
      }

      const room = io.sockets.adapter.rooms.get(matchId);

      console.log("ROOM:", room);
      console.log("ROOM SIZE:", room?.size);

      const roomSockets = io.sockets.adapter.rooms.get(matchId);
      const roomSize = roomSockets.size;

      if (roomSize <= 1) {
        if (matchInfo.requester.toString() === socket.user.id.toString()) {
          await Match.findByIdAndUpdate(matchId, {
            $inc: {
              accepterUnread: 1,
            },
          });
        } else if (
          matchInfo.accepter.toString() === socket.user.id.toString()
        ) {
          await Match.findByIdAndUpdate(matchId, {
            $inc: {
              requesterUnread: 1,
            },
          });
        }
      }

      const chat = await Chat.create({
        matchId,
        sender: socket.user.id,
        message: message.trim(),
      });

      io.to(matchId).emit("newMessage", chat);

      const recipientId = matchInfo.requester.toString() === socket.user.id.toString()
        ? matchInfo.accepter.toString()
        : matchInfo.requester.toString();
      io.to(`user:${recipientId}`).emit("newMessage", chat);

      return callback({
        success: true,
        message: chat,
      });
    } catch (error) {
      return callback({
        success: false,
        error: "Unable to send message",
      });
    }
  });
};

export const typing = (io, socket) => {
  socket.on("typing", (data) => {
    const { matchId, username } = data;

    io.to(matchId).emit("typing", username);
  });
};

export const stopTyping = (io, socket) => {
  socket.on("stopTyping", (data) => {
    const { matchId, username } = data;

    io.to(matchId).emit("stopTyping", username);
  });
};
