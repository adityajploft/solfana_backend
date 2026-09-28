import { z } from 'zod';



/* ================= CREATE USER (ADMIN) ================= */
export const CreateUserSchema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  phone: z.string().optional(),
  // profileImage: z.string().optional(),
  roleId: z.string(),
});

/* ================= UPDATE USER (ADMIN) ================= */
export const UpdateUserSchema = z.object({
  email: z.email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  profileImage: z.string().optional(),
  password: z.string().min(8).optional(),
  roleId: z.string().optional(),
  isActive: z.union([z.boolean(), z.string()])
    .transform(val => val === true || val === "true")
    .optional(),
});


