import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, 'CATEGORY_NAME_REQUIRED'),
  type: z.enum(['PODCAST', 'AUDIOBOOK'], {
    errorMap: () => ({ message: 'INVALID_CATEGORY_TYPE' })
  }),
  parentId: z.string().optional().nullable(),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true"),
  translations: z
    .union([
      // Case 1: already an array (e.g. from curl with proper Content-Type)
      z.array(
        z.object({
          lang: z.string().min(2),
          name: z.string().min(1),
        })
      ),
      // Case 2: JSON string coming from React FormData
      z.string().transform((val, ctx) => {
        try {
          const parsed = JSON.parse(val);
          if (!Array.isArray(parsed)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TRANSLATIONS_MUST_BE_ARRAY' });
            return z.NEVER;
          }
          return parsed;
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'INVALID_TRANSLATIONS_JSON' });
          return z.NEVER;
        }
      }),
    ])
    .pipe(
      z.array(
        z.object({
          lang: z.string().min(2, 'LANG_MIN_2_CHARS'),
          name: z.string().min(1, 'TRANSLATION_NAME_REQUIRED'),
        })
      )
    )
    .optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1, 'CATEGORY_NAME_REQUIRED').optional(),
  type: z.enum(['PODCAST', 'AUDIOBOOK'], {
    errorMap: () => ({ message: 'INVALID_CATEGORY_TYPE' })
  }).optional(),
  parentId: z.string().optional().nullable(),
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