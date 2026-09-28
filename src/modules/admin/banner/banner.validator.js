import { z } from "zod";
import prisma from "../../../config/db.config.js";
import { t } from "../../../common/services/i18n/i18n.service.js";

/**
 * ENUMS
 */
const BannerTypeEnum = z.enum(["STATIC", "PARTNER", "PROMOTIONAL"], { invalid_type_error: "Invalid banner type", });

const BannerActionTypeEnum = z.enum(["NONE", "EXTERNAL_URL", "INTERNAL_SCREEN"], { invalid_type_error: "Invalid action type", });

const BannerUserTypeEnum = z.enum(["ALL", "FREE_USER", "PREMIUM_USER"], { invalid_type_error: "Invalid user type", });

const BannerPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"], { invalid_type_error: "Invalid priority", });

/**
 * Placement Schema
 */
const placementSchema = (lang = "fr") =>
  z.object({
    screen: z.string({
      required_error: t(lang, "banner", "SCREEN_REQUIRED"),
      invalid_type_error: t(lang, "banner", "SCREEN_STRING_INVALID"),
    }).min(1, t(lang, "banner", "SCREEN_REQUIRED")),

    position: z.string({
      required_error: t(lang, "banner", "POSITION_REQUIRED"),
      invalid_type_error: t(lang, "banner", "POSITION_STRING_INVALID"),
    }).min(1, t(lang, "banner", "POSITION_REQUIRED")),
  });

/**
 * Create Banner Schema
 */
export const createBannerSchema = (lang = "fr") =>
  z.object({
    title: z.string({
      required_error: t(lang, "banner", "TITLE_REQUIRED"),
      invalid_type_error: t(lang, "banner", "TITLE_STRING_INVALID"),
    }).min(1, t(lang, "banner", "TITLE_REQUIRED")),

    // banner_type: BannerTypeEnum,
    banner_type: z
      .string({
        required_error: t(lang, "banner", "BANNER_TYPE_REQUIRED"),
        invalid_type_error: t(lang, "banner", "BANNER_TYPE_STRING_INVALID"),
      })
      .trim()
      .min(1, t(lang, "banner", "BANNER_TYPE_REQUIRED"))
      .max(100, t(lang, "banner", "BANNER_TYPE_MAX_LENGTH")),

    action_type: BannerActionTypeEnum,

    external_url: z.string({
      invalid_type_error: t(lang, "banner", "EXTERNAL_URL_STRING_INVALID"),
    })
    .url(t(lang, "banner", "EXTERNAL_URL_INVALID"))
    .optional(),

    internal_screen: z.string({
      invalid_type_error: t(lang, "banner", "INTERNAL_SCREEN_STRING_INVALID"),
    }).optional(),

    location: z.string({
      required_error: t(lang, "banner", "LOCATION_REQUIRED"),
      invalid_type_error: t(lang, "banner", "LOCATION_STRING_INVALID"),
    })
    .trim()
    .min(1, t(lang, "banner", "LOCATION_REQUIRED"))
    .max(255, t(lang, "banner", "LOCATION_MAX_LENGTH")),

    user_type: BannerUserTypeEnum,

    placements: z
      .string({
        required_error: t(lang, "banner", "PLACEMENTS_REQUIRED"),
        invalid_type_error: t(lang, "banner", "PLACEMENTS_STRING_INVALID"),
      })
      .transform((val, ctx) => {
        try {
          return JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(lang, "banner", "PLACEMENTS_INVALID_JSON"),
          });
          return z.NEVER;
        }
      })
      .pipe(
        z.array(placementSchema(lang)).min(
          1,
          t(lang, "banner", "PLACEMENTS_REQUIRED")
        )
      ),

    start_date: z.string({
      invalid_type_error: t(lang, "banner", "START_DATE_STRING_INVALID"),
    })
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: t(lang, "banner", "START_DATE_INVALID"),
    }),

    end_date: z.string({
      invalid_type_error: t(lang, "banner", "END_DATE_STRING_INVALID"),
    })
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: t(lang, "banner", "END_DATE_INVALID"),
    }),

    banner_event_date: z
      .string({
        invalid_type_error: t(lang, "banner", "BANNER_EVENT_DATE_STRING_INVALID"),
      })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "banner", "BANNER_EVENT_DATE_INVALID"),
      }),

    priority: BannerPriorityEnum,
  })
  .superRefine((data, ctx) => {
    /**
     * External URL validation
     */
    if (data.action_type === "EXTERNAL_URL" && !data.external_url) {
      ctx.addIssue({
        path: ["external_url"],
        code: z.ZodIssueCode.custom,
        message: t(lang, "banner", "EXTERNAL_URL_REQUIRED"),
      });
    }

    /**
     * Internal screen validation
     */
    if (data.action_type === "INTERNAL_SCREEN" && !data.internal_screen) {
      ctx.addIssue({
        path: ["internal_screen"],
        code: z.ZodIssueCode.custom,
        message: t(lang, "banner", "INTERNAL_SCREEN_REQUIRED"),
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
          message: t(lang, "banner", "END_DATE_AFTER_START_DATE"),
        });
      }
    }
  })
  .refine(
    async (data) => {
      const existing = await prisma.banner.findFirst({
        where: { title: data.title },
      });
      return !existing;
    },
    {
      path: ["title"],
      message: t(lang, "banner", "TITLE_ALREADY_TAKEN"),
    }
  );

/**
 * Update Banner Schema
 */
export const updateBannerSchema = (bannerId, lang = "fr") =>
  z.object({
    title: z.string({
      required_error: t(lang, "banner", "TITLE_REQUIRED"),
      invalid_type_error: t(lang, "banner", "TITLE_STRING_INVALID"),
    })
    .min(1, t(lang, "banner", "TITLE_REQUIRED"))
    .optional(),

    banner_image: z.string({
      invalid_type_error: t(lang, "banner", "BANNER_IMAGE_STRING_INVALID"),
    }).optional(),

    // banner_type: BannerTypeEnum.optional(),
    banner_type: z
      .string({
        required_error: t(lang, "banner", "BANNER_TYPE_REQUIRED"),
        invalid_type_error: t(lang, "banner", "BANNER_TYPE_STRING_INVALID"),
      })
      .trim()
      .min(1, t(lang, "banner", "BANNER_TYPE_REQUIRED"))
      .max(100, t(lang, "banner", "BANNER_TYPE_MAX_LENGTH"))
      .optional(),

    action_type: BannerActionTypeEnum.optional(),

    external_url: z.string({
      invalid_type_error: t(lang, "banner", "EXTERNAL_URL_STRING_INVALID"),
    })
    .url(t(lang, "banner", "EXTERNAL_URL_INVALID"))
    .optional(),

    internal_screen: z.string({
      invalid_type_error: t(lang, "banner", "INTERNAL_SCREEN_STRING_INVALID"),
    }).optional(),

    location: z.string({
      invalid_type_error: t(lang, "banner", "LOCATION_STRING_INVALID"),
    })
    .trim()
    .min(1, t(lang, "banner", "LOCATION_REQUIRED"))
    .max(255, t(lang, "banner", "LOCATION_MAX_LENGTH"))
    .optional(),

    user_type: BannerUserTypeEnum.optional(),

    placements: z
      .string({
        invalid_type_error: t(lang, "banner", "PLACEMENTS_STRING_INVALID"),
      })
      .optional()
      .transform((val, ctx) => {
        if (!val) return undefined;
        try {
          return JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(lang, "banner", "PLACEMENTS_INVALID_JSON"),
          });
          return z.NEVER;
        }
      })
      .pipe(
        z.array(placementSchema(lang)).min(1, t(lang, "banner", "PLACEMENTS_REQUIRED")).optional()
      ),

    start_date: z.string({
      invalid_type_error: t(lang, "banner", "START_DATE_STRING_INVALID"),
    })
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: t(lang, "banner", "START_DATE_INVALID"),
    }),

    end_date: z.string({
      invalid_type_error: t(lang, "banner", "END_DATE_STRING_INVALID"),
    })
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: t(lang, "banner", "END_DATE_INVALID"),
    }),

    banner_event_date: z
      .string({
        invalid_type_error: t(lang, "banner", "BANNER_EVENT_DATE_STRING_INVALID"),
      })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "banner", "BANNER_EVENT_DATE_INVALID"),
      }),

    priority: BannerPriorityEnum.optional(),

    is_active: z.string({
      invalid_type_error: t(lang, "banner", "IS_ACTIVE_STRING_INVALID"),
    })
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        ["true", "false"].includes(val),
      {
        message: t(lang, "banner", "IS_ACTIVE_INVALID"),
      }
    )
    .transform((val) =>
      val === undefined ? undefined : val === "true"
    ),
  })
    .superRefine((data, ctx) => {
      /**
       * External URL validation
       */
      if (data.action_type === "EXTERNAL_URL" && !data.external_url) {
        ctx.addIssue({
          path: ["external_url"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "banner", "EXTERNAL_URL_REQUIRED"),
        });
      }

      /**
       * Internal screen validation
       */
      if (
        data.action_type === "INTERNAL_SCREEN" &&
        !data.internal_screen
      ) {
        ctx.addIssue({
          path: ["internal_screen"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "banner", "INTERNAL_SCREEN_REQUIRED"),
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
            message: t(lang, "banner", "END_DATE_AFTER_START_DATE"),
          });
        }
      }
    })
    .refine(
      async (data) => {
        if (!data.title) return true;

        const existing = await prisma.banner.findFirst({
          where: { title: data.title, NOT: { id: bannerId, }, },
        });

        return !existing;
      },
      {
        path: ["title"],
        message: t(lang, "banner", "TITLE_ALREADY_TAKEN"),
      }
    );