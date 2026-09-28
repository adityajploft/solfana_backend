import { z } from 'zod';

/* ================= CHANGE PASSWORD ================= */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
});

/* ================= UPDATE PROFILE (USER) ================= */
export const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  profileImage: z.string().optional(),
});