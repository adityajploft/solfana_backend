import { z } from 'zod';

export const CreateRoleSchema = z.object({
  roleName: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters'),

  permissionIds: z
    .array(z.number().int())
    .optional(),
});

export const UpdateRoleSchema = z.object({
  roleName: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters')
    .optional(),

  permissionIds: z
    .array(z.number().int())
    .optional(),
});
