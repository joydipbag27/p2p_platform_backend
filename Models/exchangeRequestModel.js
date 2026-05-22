import mongoose from "mongoose";

const exchangeRequestSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["NEED_CASH", "NEED_UPI"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      default: 5,
    },
    note: {
      type: String,
      maxLength: 150,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING_MATCH", "MATCHED", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true, strict: "throw" },
);

exchangeRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ExchangeRequest = mongoose.model(
  "exchangeRequest",
  exchangeRequestSchema,
);
