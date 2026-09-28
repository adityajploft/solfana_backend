import { z } from "zod";
import prisma from "../../../config/db.config.js";
import { t } from '../../../common/services/i18n/i18n.service.js';

/**
 * ENUMS (match Prisma exactly)
 */
const CampaignTypeEnum = (lang) =>
  z.enum(["AUDIO", "BANNER", "MIXED"], {
    required_error: t(lang, "ad-campaign", "CAMPAIGN_TYPE_REQUIRED"),
    invalid_type_error: t(lang, "ad-campaign", "CAMPAIGN_TYPE_INVALID"),
  });

const CampaignUserTypeEnum = (lang) =>
  z.enum(["ALL", "FREE_USER", "PREMIUM_USER"], {
    required_error: t(lang, "ad-campaign", "USER_TYPE_REQUIRED"),
    invalid_type_error: t(lang, "ad-campaign", "USER_TYPE_INVALID"),
  });

const CampaignPriorityEnum = (lang) =>
  z.enum(["LOW", "MEDIUM", "HIGH"], {
    required_error: t(lang, "ad-campaign", "PRIORITY_REQUIRED"),
    invalid_type_error: t(lang, "ad-campaign", "PRIORITY_INVALID"),
  });

const CampaignStatusEnum = (lang) =>
  z.enum(["ACTIVE", "PAUSED", "COMPLETED"], {
    required_error: t(lang, "ad-campaign", "STATUS_REQUIRED"),
    invalid_type_error: t(lang, "ad-campaign", "STATUS_INVALID"),
  });

const CampaignAdsSchema = (lang) =>
  z.object({
    audio: z.array(z.string(), {
      invalid_type_error: t(lang, "ad-campaign", "AUDIO_ARRAY_INVALID"),
    }).optional().default([]),

    banners: z.array(z.string(), {
      invalid_type_error: t(lang, "ad-campaign", "BANNER_ARRAY_INVALID"),
    }).optional().default([]),
  });

export const createSchema = (lang='fr') => 
  z.object({
    name: z
      .string({
        required_error: t(lang, "ad-campaign", "NAME_REQUIRED"),
        invalid_type_error: t(lang, "ad-campaign", "NAME_STRING_INVALID"),
      })
      .min(1, t(lang, "ad-campaign", "NAME_REQUIRED")),

    description: z.string({
      invalid_type_error: t(lang, "ad-campaign", "DESCRIPTION_INVALID"),
    }).optional(),

    campaign_type: CampaignTypeEnum(lang),

    user_type: CampaignUserTypeEnum(lang),

    ads_data: CampaignAdsSchema(lang),

    start_date: z
      .string({
        invalid_type_error: t(lang, "ad-campaign", "START_DATE_INVALID"),
      })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "ad-campaign", "START_DATE_INVALID"),
      }),

    end_date: z
      .string({
        invalid_type_error: t(lang, "ad-campaign", "END_DATE_INVALID"),
      })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "ad-campaign", "END_DATE_INVALID"),
      }),

    priority: CampaignPriorityEnum(lang),

    status: CampaignStatusEnum(lang).optional(),
  })
  .superRefine(async (data, ctx) => {
    const { audio, banners } = data.ads_data;

    /**
     * 🔥 Type-based validation
     */
    if (data.campaign_type === "AUDIO" && banners.length > 0) {
      ctx.addIssue({
        path: ["ads_data"],
        code: z.ZodIssueCode.custom,
        message: t(lang, 'ad-campaign', 'BANNER_NOT_ALLOWED'),
      });
    }

    if (data.campaign_type === "BANNER" && audio.length > 0) {
      ctx.addIssue({
        path: ["ads_data"],
        code: z.ZodIssueCode.custom,
        message: t(lang, 'ad-campaign', 'AUDIO_AD_NOT_ALLOWED'),
      });
    }

    if (
      data.campaign_type === "MIXED" &&
      audio.length === 0 &&
      banners.length === 0
    ) {
      ctx.addIssue({
        path: ["ads_data"],
        code: z.ZodIssueCode.custom,
        message: t(lang, 'ad-campaign', 'MIX_CAMPAIGN_REQUIRED_AD'),
      });
    }

    /**
     * 🔥 Date validation
     */
    if (data.start_date && data.end_date) {
      if (new Date(data.end_date) < new Date(data.start_date)) {
        ctx.addIssue({
          path: ["end_date"],
          code: z.ZodIssueCode.custom,
          message: t(lang, 'ad-campaign', 'END_DATE_AFTER_START_DATE'),
        });
      }
    }

    /**
     * 🔥 Validate IDs exist (VERY IMPORTANT)
     */
    if (audio.length > 0) {
      const count = await prisma.audioAd.count({
        where: { id: { in: audio } },
      });

      if (count !== audio.length) {
        ctx.addIssue({
          path: ["ads_data.audio"],
          code: z.ZodIssueCode.custom,
          message: t(lang, 'ad-campaign', 'AUDIO_ID_INVALID'),
        });
      }
    }

    if (banners.length > 0) {
      const count = await prisma.banner.count({
        where: { id: { in: banners } },
      });

      if (count !== banners.length) {
        ctx.addIssue({
          path: ["ads_data.banners"],
          code: z.ZodIssueCode.custom,
          message: t(lang, 'ad-campaign', 'BANNER_ID_INVALID'),
        });
      }
    }
  })
  .refine(
    async (data) => {
      const existing = await prisma.adCampaign.findFirst({
        where: { name: data.name },
      });
      return !existing;
    },
    {
      path: ["name"],
      message: t(lang, 'ad-campaign', 'CAMPAIGN_ALREADY_EXIST'),
    }
  );


export const updateSchema = (campaignId, lang='fr') => z
  .object({
    name: z
        .string({
          invalid_type_error: t(lang, "ad-campaign", "NAME_STRING_INVALID"),
        })
        .min(1, t(lang, "ad-campaign", "NAME_REQUIRED"))
        .optional(),

    description: z
        .string({
          invalid_type_error: t(lang, "ad-campaign", "DESCRIPTION_INVALID"),
        })
        .optional(),

    campaign_type: CampaignTypeEnum(lang).optional(),

    user_type: CampaignUserTypeEnum(lang).optional(),

    ads_data: CampaignAdsSchema(lang).optional(),

    start_date: z
      .string({
        invalid_type_error: t(lang, "ad-campaign", "START_DATE_INVALID"),
      })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "ad-campaign", "START_DATE_INVALID"),
      }),

    end_date: z
      .string({
        invalid_type_error: t(lang, "ad-campaign", "END_DATE_INVALID"),
      })
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: t(lang, "ad-campaign", "END_DATE_INVALID"),
      }),

    priority: CampaignPriorityEnum(lang).optional(),

    status: CampaignStatusEnum(lang).optional(),
  })
  .superRefine(async (data, ctx) => {
    /**
     * Ads validation
     */
    if (data.ads_data) {
      const { audio = [], banners = [] } = data.ads_data;

      if (data.campaign_type === "AUDIO" && banners.length > 0) {
        ctx.addIssue({
          path: ["ads_data"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "ad-campaign", "BANNER_NOT_ALLOWED"),
        });
      }

      if (data.campaign_type === "BANNER" && audio.length > 0) {
        ctx.addIssue({
          path: ["ads_data"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "ad-campaign", "AUDIO_AD_NOT_ALLOWED"),
        });
      }

      if (data.campaign_type === "MIXED" && audio.length === 0 && banners.length === 0) {
        ctx.addIssue({
          path: ["ads_data"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "ad-campaign", "MIX_CAMPAIGN_REQUIRED_AD"),
        });
      }

      /**
       * Audio IDs validation
       */
      if (audio.length > 0) {
        const count = await prisma.audioAd.count({
          where: {
            id: {
              in: audio,
            },
          },
        });

        if (count !== audio.length) {
          ctx.addIssue({
            path: ["ads_data.audio"],
            code: z.ZodIssueCode.custom,
            message: t(lang, "ad-campaign", "AUDIO_ID_INVALID"),
          });
        }
      }

      /**
       * Banner IDs validation
       */
      if (banners.length > 0) {
        const count = await prisma.banner.count({
          where: { id: { in: banners, }, },
        });

        if (count !== banners.length) {
          ctx.addIssue({
            path: ["ads_data.banners"],
            code: z.ZodIssueCode.custom,
            message: t(lang, "ad-campaign", "BANNER_ID_INVALID"),
          });
        }
      }
    }

    /**
     * Date validation
     */
    if (data.start_date && data.end_date) {
      if (new Date(data.end_date) < new Date(data.start_date)) {
        ctx.addIssue({
          path: ["end_date"],
          code: z.ZodIssueCode.custom,
          message: t(lang, "ad-campaign", "END_DATE_AFTER_START_DATE"),
        });
      }
    }
  })
  .refine(
    async (data) => {
      if (!data.name) return true;

      const existing =
        await prisma.adCampaign.findFirst({
          where: { name: data.name, NOT: { id: campaignId, }, },
        });

      return !existing;
    },
    {
      path: ["name"],
      message: t(lang, "ad-campaign", "CAMPAIGN_ALREADY_EXIST"),
    }
  );

export const updateCampaignStatusSchema = (lang='fr') => 
  z.object({
    status: CampaignStatusEnum(lang),
  });