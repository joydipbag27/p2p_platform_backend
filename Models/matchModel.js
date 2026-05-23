import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  request: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "exchangeRequest",
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "user",
  },
  accepter: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "user",
  },
  status: {
    type: String,
    enum: ["ACTIVE", "PENDING", "COMPLETED", "CANCELLED"],
    required: true
  },
  meetUpLocation: {
    type: String
  },
  requesterConfirmed: {
    type: Boolean,
    default: false,
  },
  accepterConfirmed: {
    type: Boolean,
    default: false,
  },
},
{
  strict: "throw",
  timestamps: true
});


matchSchema.index({
  request: 1,
  status: 1,
});

matchSchema.index({
  requester: 1,
  status: 1,
});

matchSchema.index({
  accepter: 1,
  status: 1,
});


export const Match = mongoose.model("match", matchSchema)