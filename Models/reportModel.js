import mongoose from "mongoose";
import { maxLength } from "zod";

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "user",
  },
  reportedUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "user",
  },
  matchId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "match",
  },
  reason: {
    type: String,
    enum: [
      "SPAM",
      "FAKE_PROFILE",
      "HARASSMENT",
      "SCAM_ATTEMPT",
      "USER_DID_NOT_SHOW_UP",
      "FAKE_CASH",
      "FAKE_PAYMENT_PROOF",
      "INAPPROPRIATE_BEHAVIOR",
      "OTHER",
    ],
    required: true
  },
  description: {
    type: String,
    maxLength: 500
  },
  status: {
    type: String,
    enum: ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"],
    default: "OPEN"
  }

}, {
    timestamps: true,
    strict: "throw"
})

export const Report = mongoose.model("report", reportSchema)
