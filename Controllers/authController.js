import { OAuth2Client } from "google-auth-library";
import { verifyCredential } from "../services/email/googleAuth.js";
import { User } from "../models/userModel.js";
import { errorResponse, successResponse } from "../utils/response.js";
import mongoose from "mongoose";
import { Session } from "../models/sessionModel.js";
import { OTP } from "../models/otpModel.js";
import { sendOtpSchema, verifyOtpSchema } from "../validators/zodSchema.js";
import { sendOtpFunc } from "../services/email/sendOtp.js";
import crypto from "crypto"

export const loginWithGoogle = async (req, res) => {
  const { credential } = req.body;

  const userData = await verifyCredential(credential);

  const { email, name, email_verified } = userData;

  if (!email_verified) {
    return errorResponse(res, 400, "Google email not verified");
  }

  const existingUser = await User.findOne({ email });
  const newSessionId = new mongoose.Types.ObjectId();
  const sessionMaxAge = 1000 * 60 * 60 * 24 * 7;
  const newUserId = new mongoose.Types.ObjectId();

  //REGISTER
  if (!existingUser) {
    try {
      await User.create({
        _id: newUserId,
        email,
        username: name,
        avatar: `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURI(name)}`,
      });
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, "Failed to register");
    }
  } else {
    //LOGIN
    const userSession = await Session.find({ userId: existingUser._id });

    if (userSession.length >= 1) {
      await Session.findByIdAndDelete(userSession[0]._id);
    }
  }

  try {
    await Session.create({
      _id: newSessionId,
      userId: existingUser ? existingUser._id : newUserId,
      expiresAt: new Date(Date.now() + sessionMaxAge),
    });

    res.cookie("sid", newSessionId, {
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
  const existingUser = await User.findOne({ email });

  if (!isMatched) {
    return errorResponse(res, 400, "Invalid OTP");
  }

  const setQuery = {isVerified: true }

  if (isMatched.purpose === "FORGOT_PASSWORD") {
    setQuery.isEmailRegistered = !!existingUser
  }

  await OTP.findOneAndUpdate(
    {
      email,
      purpose,
      otp: otp.toString(),
    },
    { $set:  setQuery  },
  );

  return successResponse(res, 200, "OTP verified successfully");
};
