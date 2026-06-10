import mongoose from "mongoose";
import { Match } from "../models/matchModel.js";
import { Review } from "../models/reviewModel.js";
import { User } from "../models/userModel.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { reviewSchema } from "../validators/zodSchema.js";

export const createReview = async (req, res) => {
  const { matchId, rating, comment } = req.body;

  if (!mongoose.isValidObjectId(matchId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const { success, data, error } = reviewSchema.safeParse({ rating, comment });

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { rating: ratingData, comment: commentData } = data;

  const matchInfo = await Match.findOne({
    _id: matchId,
  });

  if (!matchInfo) {
    return errorResponse(res, 400, "Unable to find match info");
  }

  if (!matchInfo.completedAt) {
    return errorResponse(
      res,
      400,
      "Reviews can only be submitted for completed exchanges",
    );
  }

  if (
    matchInfo.requester.toString() !== req.user.id.toString() &&
    matchInfo.accepter.toString() !== req.user.id.toString()
  ) {
    return errorResponse(res, 403, "You are not part of this exchange");
  }

  let reviewedUser;
  let isAccepter;
  if (matchInfo.requester.toString() === req.user.id.toString()) {
    reviewedUser = matchInfo.accepter;
    isAccepter = true;
  } else {
    reviewedUser = matchInfo.requester;
    isAccepter = false;
  }

  const existingReview = await Review.findOne({
    matchId,
    reviewer: req.user.id,
  });

  if (existingReview) {
    return errorResponse(res, 400, "You already reviewed this exchange");
  }

  await Review.create({
    reviewer: req.user.id,
    reviewedUser,
    matchId,
    rating: ratingData,
    comment: commentData,
  });

  const stats = await Review.aggregate([
    {
      $match: {
        reviewedUser: new mongoose.Types.ObjectId(reviewedUser),
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  await User.findOneAndUpdate(
    { _id: reviewedUser },
    {
      $set: {
        trustScore: stats[0].averageRating.toFixed(2),
        totalReviews: stats[0].totalReviews,
      },
    },
  );

  if (isAccepter) {
    await Match.findByIdAndUpdate(matchId, {
      $set: { requesterReviewed: true },
    });
  } else {
    await Match.findByIdAndUpdate(matchId, {
      $set: { accepterReviewed: true },
    });
  }

  return successResponse(res, 200, "Review created successfully");
};

export const getReviews = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return errorResponse(res, 400, "Invalid match ID");
  }

  const userInfo = await User.findById(userId);

  if (!userInfo) {
    return errorResponse(res, 400, "User not found");
  }

  const reviews = await Review.find({ reviewedUser: userId })
    .select("-matchId")
    .populate("reviewer", "username avatar")
    .populate("reviewedUser", "username avatar")
    .sort({ createdAt: -1 });

  const totalReviews = reviews.length;

  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  return successResponse(res, 200, "Reviews fetched", {
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews,
    reviews,
  });
};

export const getOwnReviews = async (req, res) => {
  const reviews = await Review.find({ reviewedUser: req.user.id })
    .populate("reviewer", "username avatar")
    .populate("reviewedUser", "username avatar")
    .populate("matchId")
    .sort({ createdAt: -1 });

  const totalReviews = reviews.length;

  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  return successResponse(res, 200, "Reviews fetched", {
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews,
    reviews,
  });
};
