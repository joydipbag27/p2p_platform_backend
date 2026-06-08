import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "user",
    },
    reviewedUser: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "user",
    },
    matchId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "match",
    },
    rating: {
      type: Number,
      max: 5,
      min: 1,
      required: true,
    },
    comment: {
      type: String,
      default: "",
      maxlength: 500
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

reviewSchema.index({ reviewer: 1, matchId: 1 }, { unique: true });

export const Review = mongoose.model("review", reviewSchema);
