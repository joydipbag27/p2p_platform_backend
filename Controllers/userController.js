import mongoose from "mongoose";
import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import { loginSchema, registerSchema } from "../validators/zodSchema.js";
import bcrypt from "bcrypt";

export const emailRegister = async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }

  const { username, password, email } = data;

  const hashedPass = await bcrypt.hash(password, 10);

  try {
    await User.create({
      username,
      email,
      password: hashedPass,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create user" });
  }

  res.status(200).json({ info: "Registration successful" });
};

export const emailLogin = async (req, res) => {
  const { success, data, error } = loginSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }

  const { email, password } = data;

  const userInfo = await User.findOne({ email });

  if (!userInfo) {
    return res
      .status(400)
      .json({ error: "Unable to find user please check your email carefully" });
  }

  const isPasswordMatched = await bcrypt.compare(password, userInfo.password);

  if (!isPasswordMatched) {
    return res.status(400).json({ error: "Wrong password, please try again" });
  }

  const userSession = await Session.find({ userId: userInfo._id });

  if (userSession.length >= 2) {
    await Session.findByIdAndDelete(userSession[0]._id);
  }

  const sessionMaxAge = 1000 * 60 * 60 * 24 * 7;
  const sessionId = new mongoose.Types.ObjectId();

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

  res.status(200).json({ info: "User logged in successfully" });
};

export const getUser = async (req, res) => {
  res.json(req.user.id);
};
