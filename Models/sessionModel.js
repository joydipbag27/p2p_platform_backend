import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

sessionSchema.index({expiresAt: 1}, {expireAfterSeconds: 0})


export const Session = mongoose.model("session", sessionSchema);
