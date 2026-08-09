import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Please enter a valid email")),

  password: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters long")
    .max(100, "Password can't exceed 100 characters"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username should be at least 3 character long")
    .max(100, "Username can't exceed 100 characters"),

  email: z.string().trim().pipe(z.email("Please enter a valid email")),

  password: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters long")
    .max(100, "Password can't exceed 100 characters"),
});

export const exchangeRequestSchema = z.object({
  type: z.enum(["NEED_CASH", "NEED_UPI"]),
  amount: z.coerce
    .number()
    .min(100, "Minimum amount is 100")
    .max(50000, "Maximum value is 50000"),
  note: z.string().max(150, "Maximum note length is 150 letters").optional(),
  expiry: z.coerce
    .number()
    .min(5, "Minimum expiry is 5 minutes")
    .max(60, "Maximum expiry is 60 minutes"),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Chat length must be 1 character")
    .max(300, "Chat length can't exceed 300 characters"),
});

export const reviewSchema = z.object({
  comment: z
    .string()
    .trim()
    .max(500, "Review comment can't exceed 500 characters")
    .optional(),
  rating: z.coerce
    .number()
    .max(5, "Rating maximum value is 5")
    .min(1, "Rating minimum value is 1"),
});

export const sendOtpSchema = z.object({
  email: z.string().trim().pipe(z.email("Please enter a valid email")),
  purpose: z.enum(["REGISTER", "PASSWORD_CHANGE", "FORGOT_PASSWORD"]),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().pipe(z.email("Please enter a valid email")),
  otp: z.coerce.number().max(999999, "Invalid OTP").min(100000, "Invalid OTP"),
  purpose: z.enum(["REGISTER", "PASSWORD_CHANGE", "FORGOT_PASSWORD"]),
});

export const forgotPassSchema = z.object({
  email: z.string().trim().pipe(z.email("Please enter a valid email")),
  newPassword: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters long")
    .max(100, "Password can't exceed 100 characters"),
});

export const setNewPassSchema = z.object({
  newPassword: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters long")
    .max(100, "Password can't exceed 100 characters"),
});

export const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters long")
    .max(100, "Password can't exceed 100 characters"),

  oldPassword: z
    .string()
    .trim()
    .min(8, "Password must be 8 characters long")
    .max(100, "Password can't exceed 100 characters"),
});

export const createReportSchema = z.object({
  reportedUserId: z.string().trim().min(1, "Reported user is required"),

  matchId: z.string().trim().min(1, "Match is required"),

  reason: z.enum(
    [
      "SPAM",
      "FAKE_PROFILE",
      "HARASSMENT",
      "SCAM_ATTEMPT",
      "USER_DID_NOT_SHOW_UP",
      "FAKE_CASH",
      "FAKE_PAYMENT_PROOF",
      "INAPPROPRIATE_BEHAVIOR",
      "OTHER",
    ],
    {
      message: "Invalid report reason",
    },
  ),

  description: z
    .string()
    .trim()
    .min(10, "Please provide more details")
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});
