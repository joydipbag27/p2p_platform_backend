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
