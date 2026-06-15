import mongoose from "mongoose";
import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import {
  changePasswordSchema,
  forgotPassSchema,
  loginSchema,
  registerSchema,
  sendOtpSchema,
  setNewPassSchema,
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

    await OTP.deleteOne({
      email,
      purpose: "REGISTER",
      isVerified: true,
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

  if (!userInfo.password) {
    return errorResponse(
      res,
      400,
      "This account doesn't have a password. Please login with Google ",
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
    await Session.create({
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

export const forgotPass = async (req, res) => {
  const { success, data, error } = forgotPassSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { email, newPassword } = data;

  const otpInfo = await OTP.findOne({
    email,
    purpose: "FORGOT_PASSWORD",
    isVerified: true,
  });

  if (!otpInfo) {
    return errorResponse(res, 403, "Please verify the email");
  }

  if (!otpInfo.isEmailRegistered) {
    return errorResponse(
      res,
      403,
      "You can't change an unregistered email's password",
    );
  }

  const hashedPass = await bcrypt.hash(newPassword, 10);

  try {
    const updatedUser = await User.findOneAndUpdate(
      {
        email,
      },
      { $set: { password: hashedPass } },
    );

    if (!updatedUser) {
      return errorResponse(res, 404, "User not found");
    }

    await Session.deleteMany({
      userId: updatedUser._id,
    });

    await OTP.deleteOne({
      email,
      purpose: "FORGOT_PASSWORD",
      isVerified: true,
      isEmailRegistered: true,
    });

    return successResponse(res, 200, "Your password changed successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to change password");
  }
};

export const passwordStatus = async (req, res) => {
  try {
    const userInfo = await User.findById(req.user.id);

    if (!userInfo) {
      return errorResponse(res, 400, "User not found");
    }

    return successResponse(res, 200, "Password status fetched successfully", {
      isPassAvaillable: !!userInfo.password,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to check password status");
  }
};

export const setNewPass = async (req, res) => {
  const { success, data, error } = setNewPassSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { newPassword } = data;

  const userInfo = await User.findById(req.user.id);

  if (!userInfo) {
    return errorResponse(res, 400, "User not found");
  }

  if (userInfo.password) {
    return errorResponse(res, 400, "You already have a password");
  }

  const otpInfo = await OTP.findOne({
    email: userInfo.email,
    purpose: "SET_PASSWORD",
    isVerified: true,
  });

  if (!otpInfo) {
    return errorResponse(res, 403, "Please verify the email");
  }

  const hashedPass = await bcrypt.hash(newPassword, 10);

  try {
    await User.findOneAndUpdate(
      {
        _id: req.user.id,
      },
      { $set: { password: hashedPass } },
    );

    await Session.deleteMany({
      userId: req.user.id,
    });

    await OTP.deleteOne({
      _id: otpInfo._id,
    });

    return successResponse(res, 200, "Your password changed successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to set new password");
  }
};

export const changePassword = async (req, res) => {
  const { success, data, error } = changePasswordSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { newPassword, oldPassword } = data;

  if (oldPassword === newPassword) {
  return errorResponse(
    res,
    400,
    "New password must be different from the old password"
  );
}

  const userInfo = await User.findById(req.user.id);

  if (!userInfo) {
    return errorResponse(res, 400, "User not found");
  }

  if (!userInfo.password) {
    return errorResponse(res, 400, "This account does not have a password");
  }

  const otpInfo = await OTP.findOne({
    email: userInfo.email,
    purpose: "CHANGE_PASSWORD",
    isVerified: true,
  });

  if (!otpInfo) {
    return errorResponse(res, 403, "Please verify the email");
  }

  //CHECK OLD PASSWORD
  const isPasswordMatched = await bcrypt.compare(oldPassword, userInfo.password);

  if(!isPasswordMatched){
    return errorResponse(res, 403, "Wrong password, please try again")
  }

  const hashedNewPass = await bcrypt.hash(newPassword, 10);

  try {
    await User.findOneAndUpdate(
      {
        _id: req.user.id,
      },
      { $set: { password: hashedNewPass } },
    );

    await Session.deleteMany({
      userId: req.user.id,
    });

    await OTP.deleteOne({
      _id: otpInfo._id,
    });

    return successResponse(res, 200, "Your password changed successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Failed to set new password");
  }
}