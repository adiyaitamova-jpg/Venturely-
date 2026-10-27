import { z } from "zod";
import { text } from "./common";

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters")
  .refine((p) => /[a-zA-Z]/.test(p) && /[^a-zA-Z]/.test(p), "Mix letters with numbers or symbols");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const signUpSchema = z.object({
  displayName: text(60, 2),
  email: emailSchema,
  password: passwordSchema,
  ageConfirmed: z.literal(true, { error: "You need to confirm this to join" }),
});
export type SignUpInput = z.input<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});
export type SignInInput = z.input<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
