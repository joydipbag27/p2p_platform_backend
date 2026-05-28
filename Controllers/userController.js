import mongoose from "mongoose";
import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import { loginSchema, registerSchema } from "../validators/zodSchema.js";
import bcrypt from "bcrypt";
import { errorResponse, successResponse } from "../utils/response.js";

export const emailRegister = async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);

  if (!success) {
    return errorResponse(res, 400, error.issues[0].message);
  }

  const { username, password, email } = data;

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

  if (userSession.length >= 2) {
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
