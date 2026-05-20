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
    .min(500, "Minimum amount is 500")
    .max(50000, "Maximum value is 50000"),
  radius: z.coerce
    .number()
    .min(1, "Minimum radius is 1km")
    .max(50, "Maximum radius is 50km")
    .optional(),
  note: z.string().max(150, "Maximum note length reached").optional(),
  expiry: z.coerce
    .number()
    .min(5, "Minimum expiry is 5 minutes")
    .max(60, "Maximum expiry is 60 minutes"),
});
