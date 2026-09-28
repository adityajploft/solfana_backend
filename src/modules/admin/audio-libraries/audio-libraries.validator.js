import { z } from "zod";

/**
 * Optional text fields you may want in future
 * (Remove if not needed)
 */
export const CreateAudioLibrarySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "TITLE_REQUIRED")
      .max(255, "TITLE_TOO_LONG")
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, "DESCRIPTION_TOO_LONG")
      .optional(),
  })
  .strict();

/**
 * Query validator (for pagination / filtering if needed)
 */
export const GetAudioLibraryQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "INVALID_PAGE")
    .transform(Number)
    .optional(),

  limit: z
    .string()
    .regex(/^\d+$/, "INVALID_LIMIT")
    .transform(Number)
    .optional(),

  search: z
    .string()
    .trim()
    .max(255, "SEARCH_TOO_LONG")
    .optional(),
});

/**
 * ID param validator
 */
export const AudioLibraryIdParamSchema = z.object({
  id: z
    .string()
    .uuid("INVALID_AUDIO_ID"),
});