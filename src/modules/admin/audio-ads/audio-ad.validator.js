import { z } from "zod";
import prisma from "../../../config/db.config.js";
import { t } from "../../../common/services/i18n/i18n.service.js";

/**
 * Common placement schema
 */
const placementSchema = (lang = "fr") =>
  z.object({
    screen: z.string({
      required_error: t(lang, "audio-ad", "SCREEN_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "SCREEN_STRING_INVALID"),
    }).min(1, t(lang, "audio-ad", "SCREEN_REQUIRED")),

    position: z.string({
      required_error: t(lang, "audio-ad", "POSITION_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "POSITION_STRING_INVALID"),
    }).min(1, t(lang, "audio-ad", "POSITION_REQUIRED")),
  });

/**
 * Create Audio Ad Schema
 */
export const createAudioAdSchema = (lang = "fr") =>
  z.object({
    title: z.string({
      required_error: t(lang, "audio-ad", "TITLE_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "TITLE_STRING_INVALID"),
    }).min(1, t(lang, "audio-ad", "TITLE_REQUIRED")),

    description: z.string({
      invalid_type_error: t(lang, "audio-ad", "DESCRIPTION_STRING_INVALID"),
    }).optional(),

    placements: z
      .string({
        required_error: t(lang, "audio-ad", "PLACEMENTS_REQUIRED"),
        invalid_type_error: t(lang, "audio-ad", "PLACEMENTS_STRING_INVALID"),
      })
      .transform((val, ctx) => {
        try {
          return JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(lang, "audio-ad", "PLACEMENTS_INVALID_JSON"),
          });

          return z.NEVER;
        }
      })
      .pipe(
        z.array(placementSchema(lang)).min(
          1,
          t(lang, "audio-ad", "PLACEMENTS_REQUIRED")
        )
      ),

    skip_enabled: z.string({
      required_error: t(lang, "audio-ad", "SKIP_ENABLED_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "SKIP_ENABLED_STRING_INVALID"),
    })
    .refine((val) => ["true", "false"].includes(val), {
      message: t(lang, "audio-ad", "SKIP_ENABLED_INVALID"),
    })
    .transform((val) => val === "true"),

    skip_after_sec: z
      .string({
        invalid_type_error: t(lang, "audio-ad", "SKIP_AFTER_SEC_STRING_INVALID"),
      })
      .optional()
      .transform((val, ctx) => {
        if (!val) return undefined;

        const parsed = Number(val);
        if (isNaN(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(lang, "audio-ad", "SKIP_AFTER_SEC_INVALID"),
          });

          return z.NEVER;
        }

        return parsed;
      }),

    user_type: z.string({
      required_error: t(lang, "audio-ad", "USER_TYPE_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "USER_TYPE_STRING_INVALID"),
    }).min(1, t(lang, "audio-ad", "USER_TYPE_REQUIRED")),

    start_date: z.string({
      required_error: t(lang, "audio-ad", "START_DATE_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "START_DATE_STRING_INVALID"),
    })
      .min(1, t(lang, "audio-ad", "START_DATE_REQUIRED"))
      .refine((val) => !isNaN(Date.parse(val)), {
        message: t(lang, "audio-ad", "START_DATE_INVALID"),
      }),

    end_date: z.string({
      required_error: t(lang, "audio-ad", "END_DATE_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "END_DATE_STRING_INVALID"),
    })
      .min(1, t(lang, "audio-ad", "END_DATE_REQUIRED"))
      .refine((val) => !isNaN(Date.parse(val)), {
        message: t(lang, "audio-ad", "END_DATE_INVALID"),
      }),

    priority: z.string({
      required_error: t(lang, "audio-ad", "PRIORITY_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "PRIORITY_STRING_INVALID"),
    }).min(1, t(lang, "audio-ad", "PRIORITY_REQUIRED")),
  })
  .superRefine((data, ctx) => {
    /**
     * Skip validation
     */
    if (
      data.skip_enabled &&
      (!data.skip_after_sec || data.skip_after_sec <= 0)
    ) {
      ctx.addIssue({
        path: ["skip_after_sec"],
        code: z.ZodIssueCode.custom,
        message: t(lang, "audio-ad", "SKIP_AFTER_SEC_REQUIRED"),
      });
    }

    /**
     * Date validation
     */
    if (new Date(data.end_date) < new Date(data.start_date)) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: t(lang, "audio-ad", "END_DATE_AFTER_START_DATE"),
      });
    }
  })
  .refine(
    async (data) => {
      const existing = await prisma.audioAd.findFirst({
        where: {
          title: data.title,
        },
      });

      return !existing;
    },
    {
      path: ["title"],
      message: t(lang, "audio-ad", "TITLE_ALREADY_TAKEN"),
    }
  );

/**
 * Update Audio Ad Schema
 */
export const updateAudioAdSchema = (audioAddId, lang = "fr") =>
  z.object({
    title: z.string({
      required_error: t(lang, "audio-ad", "TITLE_REQUIRED"),
      invalid_type_error: t(lang, "audio-ad", "TITLE_STRING_INVALID"),
    })
      .min(1, t(lang, "audio-ad", "TITLE_REQUIRED"))
      .optional(),

    description: z.string({
      invalid_type_error: t(lang, "audio-ad", "DESCRIPTION_STRING_INVALID"),
    }).optional(),

    placements: z
      .string({
        invalid_type_error: t(lang, "audio-ad", "PLACEMENTS_STRING_INVALID"),
      })
      .optional()
      .transform((val, ctx) => {
        if (!val) return undefined;

        try {
          return JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(lang, "audio-ad", "PLACEMENTS_INVALID_JSON"),
          });

          return z.NEVER;
        }
      })
      .pipe(
        z.array(placementSchema(lang))
          .min(1, t(lang, "audio-ad", "PLACEMENTS_REQUIRED"))
          .optional()
      ),

    skip_enabled: z.string({
      invalid_type_error: t(lang, "audio-ad", "SKIP_ENABLED_STRING_INVALID"),
    })
      .optional()
      .refine(
        (val) => val === undefined || ["true", "false"].includes(val),
        {
          message: t(lang, "audio-ad", "SKIP_ENABLED_INVALID"),
        }
      )
      .transform((val) =>
        val === undefined ? undefined : val === "true"
      ),

    skip_after_sec: z.string({
      invalid_type_error: t(
        lang,
        "audio-ad",
        "SKIP_AFTER_SEC_STRING_INVALID"
      ),
    })
      .optional()
      .transform((val, ctx) => {
        if (!val) return undefined;

        const parsed = Number(val);

        if (isNaN(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(lang, "audio-ad", "SKIP_AFTER_SEC_INVALID"),
          });

          return z.NEVER;
        }

        return parsed;
      }),

    user_type: z.string({
      invalid_type_error: t(lang, "audio-ad", "USER_TYPE_STRING_INVALID"),
    }).optional(),

    start_date: z.string({
      invalid_type_error: t(lang, "audio-ad", "START_DATE_STRING_INVALID"),
    })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "audio-ad", "START_DATE_INVALID"),
      }),

    end_date: z.string({
      invalid_type_error: t(lang, "audio-ad", "END_DATE_STRING_INVALID"),
    })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "audio-ad", "END_DATE_INVALID"),
      }),

    priority: z.string({
      invalid_type_error: t(lang, "audio-ad", "PRIORITY_STRING_INVALID"),
    }).optional(),

    is_active: z.string({
      invalid_type_error: t(
        lang,
        "audio-ad",
        "IS_ACTIVE_STRING_INVALID"
      ),
    })
      .optional()
      .refine(
        (val) => val === undefined || ["true", "false"].includes(val),
        {
          message: t(lang, "audio-ad", "IS_ACTIVE_INVALID"),
        }
      )
      .transform((val) =>
        val === undefined ? undefined : val === "true"
      ),
  })
    .superRefine((data, ctx) => {
      /**
       * Skip validation
       */
      if (
        data.skip_enabled === true &&
        (!data.skip_after_sec || data.skip_after_sec <= 0)
      ) {
        ctx.addIssue({
          path: ["skip_after_sec"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "audio-ad", "SKIP_AFTER_SEC_REQUIRED"),
        });
      }

      /**
       * Date validation
       */
      if (data.start_date && data.end_date) {
        if (new Date(data.end_date) < new Date(data.start_date)) {
          ctx.addIssue({
            path: ["end_date"],
            code: z.ZodIssueCode.custom,
            message: t(lang, "audio-ad", "END_DATE_AFTER_START_DATE"),
          });
        }
      }
    })
    .refine(
      async (data) => {
        if (!data.title) return true;

        const existing = await prisma.audioAd.findFirst({
          where: {
            title: data.title,
            NOT: {
              id: audioAddId,
            },
          },
        });

        return !existing;
      },
      {
        path: ["title"],
        message: t(lang, "audio-ad", "TITLE_ALREADY_TAKEN"),
      }
    );