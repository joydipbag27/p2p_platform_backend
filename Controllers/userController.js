import mongoose from "mongoose";
import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "../validators/zodSchema.js";
import bcrypt from "bcrypt";
import { errorResponse, successResponse } from "../utils/response.js";
import { Review } from "../models/reviewModel.js";
import { sendOtpFunc } from "../services/email/sendOtp.js";
import { OTP } from "../models/otpModel.js";
import crypto from "crypto";

export const emailRegister = async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { username, password, email } = data;

  const isVerified = await OTP.findOne({
    email,
    purpose: "REGISTER",
    isVerified: true,
  });

  if (!isVerified) {
    return errorResponse(res, 403, "Please verify the email");
  }

  const hashedPass = await bcrypt.hash(password, 10);

  try {
    await User.create({
      username,
      email,
      password: hashedPass,
      avatar: `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURI(username)}`,
    });

    return successResponse(res, 200, "Registration successful");
  } catch (error) {
    return errorResponse(res, 500, "Failed to create user");
  }
};

export const emailLogin = async (req, res) => {
  const { success, data, error } = loginSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { email, password } = data;

  const userInfo = await User.findOne({ email });

  if (!userInfo) {
    return errorResponse(
      res,
      400,
      "Unable to find user please check your email carefully",
    );
  }

  const isPasswordMatched = await bcrypt.compare(password, userInfo.password);

  if (!isPasswordMatched) {
    return errorResponse(res, 401, "Wrong password, please try again");
  }

  const userSession = await Session.find({ userId: userInfo._id });

  if (userSession.length >= 1) {
    await Session.findByIdAndDelete(userSession[0]._id);
  }

  const sessionMaxAge = 1000 * 60 * 60 * 24 * 7;
  const sessionId = new mongoose.Types.ObjectId();

  try {
    const sessionInfo = await Session.create({
      _id: sessionId,
      userId: userInfo._id,
      expiresAt: new Date(Date.now() + sessionMaxAge),
    });

    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
    });
    return successResponse(res, 200, "User logged in successfully");
  } catch (error) {
    return errorResponse(res, 500, "Failed to create session");
  }
};

export const getUser = async (req, res) => {
  try {
    const userInfo = await User.findById(req.user.id).select("-password");

    return successResponse(
      res,
      200,
      "User info fetched successfully",
      userInfo,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 400, "Failed to get user info");
  }
};

export const getOthersProfile = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return errorResponse(res, 400, "Invalid user ID");
  }

  try {
    const userInfo = await User.findById(userId).select("-password");

    if (!userInfo) {
      return errorResponse(res, 400, "User not found");
    }

    const reviews = await Review.find({ reviewedUser: userId })
      .select("-matchId")
      .populate("reviewer", "username avatar trustScore totalReviews")
      .populate("reviewedUser", "username avatar trustScore totalReviews")
      .limit(10)
      .sort({ createdAt: -1 });

    const payload = {
      username: userInfo.username,
      avatar: userInfo.avatar,
      trustScore: userInfo.trustScore,
      totalReviews: userInfo.totalReviews,
      createdAt: userInfo.createdAt,
      recentReviews: reviews,
    };

    return successResponse(res, 200, "User info fetched successfully", payload);
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Failed to get user info");
  }
};

export const logout = async (req, res) => {
  try {
    const userInfo = await User.findById(req.user.id);

    if (!userInfo) {
      return errorResponse(res, 400, "User not found");
    }

    const sessions = await Session.deleteMany({ userId: req.user.id });

    res.clearCookie("sid", {
      httpOnly: true,
    });

    return successResponse(res, 200, "Logout completed successfully");
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Failed to logout");
  }
};

export const sendOtp = async (req, res) => {
  const { success, data, error } = sendOtpSchema.safeParse(req.body);

  if (!success) {
    console.log(error);
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { email, purpose } = data;

  const otpStr = crypto.randomInt(100000, 999999).toString();

  const existingOtp = await OTP.findOne({ email, purpose });

  if (existingOtp) {
    const now = Date.now();
    const coolDownPeriod = Date.now(existingOtp.createdAt) + 1000 * 60;

    if (now < coolDownPeriod) {
      return errorResponse(
        res,
        400,
        "Please wait before requesting another OTP",
      );
    }

    await OTP.findOneAndUpdate(
      { email, purpose },
      {
        $set: {
          otp: otpStr,
          expireAt: new Date(Date.now() + 1000 * 60 * 10),
        },
      },
    );
  } else {
    await OTP.create({
      email,
      otp: otpStr,
      expireAt: new Date(Date.now() + 1000 * 60 * 10),
      purpose,
    });
  }

  const { isSent } = await sendOtpFunc(email, otpStr);

  if (!isSent) {
    await OTP.findOneAndDelete({ email });
    return errorResponse(res, 500, "Failed to send OTP");
  }

  return successResponse(res, 200, "OTP sent successfully");
};

export const verifyOtp = async (req, res) => {
  const { success, data, error } = verifyOtpSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { email, otp, purpose } = data;

  const isMatched = await OTP.findOne({ email, otp: otp.toString() });

  if (!isMatched) {
    return errorResponse(res, 400, "Invalid OTP");
  }

  await OTP.findOneAndUpdate(
    {
      email,
      purpose,
      otp: otp.toString(),
    },
    { $set: { isVerified: true } },
  );

  return successResponse(res, 200, "OTP verified successfully");
};
