import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "match",
    },
    sender: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "user",
    },
    message: {
      type: String,
      required: true,
    },
  },

  {
    timestamps: true,
    strict: "throw",
  },
);

export const Chat = mongoose.model("chat", chatSchema);
