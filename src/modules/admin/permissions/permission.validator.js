import { z } from 'zod';

// Each individual permission item
export const PermissionItemSchema = z.object({
  module: z
    .string()
    .min(1, 'Module is required'),

  actions: z
    .array(z.string().min(1))
    .nonempty('At least one action is required'),
});

// DTO for creating multiple permissions at once
export const CreatePermissionSchema = z.object({
  
  permissions: z
    .array(PermissionItemSchema)
    .nonempty('Permissions array cannot be empty'),
});

