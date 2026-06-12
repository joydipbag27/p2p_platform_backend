import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    otp: {
      type: String,
      required: true,
    },
    expireAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    purpose: {
        type: String,
        enum: ["REGISTER", "PASSWORD_CHANGE", "FORGOT_PASSWORD"],
        required: true
    }
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

export const OTP = mongoose.model("otp", otpSchema);
