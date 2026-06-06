import mongoose from "mongoose";

const exchangeRequestSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
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
    note: {
      type: String,
      maxLength: 150,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "MATCHED", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    expiresAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (arr) => arr.length === 2,
          message: "Coordinates must contain longitude and latitude",
        },
      },
    },
  },
  { timestamps: true, strict: "throw" },
);

exchangeRequestSchema.index({
  creator: 1,
  status: 1,
});

exchangeRequestSchema.index({
  status: 1,
  expiresAt: 1,
});

exchangeRequestSchema.index({ location: "2dsphere" });

export const ExchangeRequest = mongoose.model(
  "exchangeRequest",
  exchangeRequestSchema,
);
