import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fcmToken: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(
  data => data.newPassword === data.confirmPassword,
  {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  }
);
