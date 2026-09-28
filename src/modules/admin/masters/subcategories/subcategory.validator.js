import { z } from 'zod';

export const CreateSubCategorySchema = z.object({
  name: z.string().trim().min(1, 'SUB_CATEGORY_NAME_REQUIRED'),

  parentId: z.string().uuid('PARENT_ID_REQUIRED'),

  type: z.enum(['PODCAST', 'AUDIOBOOK'], {
    errorMap: () => ({ message: 'INVALID_TYPE' }),
  }),

  isActive: z.boolean().optional(),

  translations: z
    .array(
      z.object({
        lang: z.string().min(2),
        name: z.string().min(1),
      })
    )
    .optional(),
});

export const UpdateSubCategorySchema = z.object({
  name: z.string().min(1, 'SUB_CATEGORY_NAME_REQUIRED').optional(),

  parentId: z.string().uuid().optional(),

  type: z.enum(['PODCAST', 'AUDIOBOOK']).optional(),

  isActive: z.boolean().optional(),

  translations: z
    .array(
      z.object({
        lang: z.string().min(2),
        name: z.string().min(1),
      })
    )
    .optional(),
});