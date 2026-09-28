import { z } from "zod";
import prisma from "../../../config/db.config.js";

/**
 * =========================
 * ENUMS
 * =========================
 */
const ChannelTypeEnum = z.enum(["PUSH", "EMAIL", "BOTH"]);

const ScheduleTypeEnum = z.enum(["ONETIME", "RECURRING"]);

const RecurringOptionEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

const TargetTypeEnum = z.enum(["FREE_USERS", "PREMIUM_USERS", "ALL", "SPECIFIC_USERS"]);

const NotificationCampaignStatusEnum = z.enum(["ACTIVE", "PAUSED", "COMPLETED"]);

/**
 * =========================
 * BASE SCHEMA
 * =========================
 */
const baseCampaignSchema = z.object({
  name: z.string().min(1, "name is required"),

  description: z.string().min(1, "description is required"),

  channel_type: ChannelTypeEnum,

  /**
   * EMAIL FIELDS
   */
  subject: z.string().optional(),
  body: z.string().optional(),

  /**
   * PUSH FIELDS
   */
  title: z.string().optional(),
  message: z.string().optional(),

  /**
   * DATE
   */
  start_date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "invalid start_date",
    }),

  end_date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "invalid end_date",
    }),

  /**
   * SCHEDULE
   */
  schedule_type: ScheduleTypeEnum,
  recurring_option: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;

      if (!["DAILY", "WEEKLY", "MONTHLY"].includes(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid recurring_option",
        });
      }
    }),

  /**
   * TARGET
   */
  target_type: TargetTypeEnum,

  recipient_ids: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val, ctx) => {
      if (!val) return [];

      if (Array.isArray(val)) return val;

      try {
        return JSON.parse(val);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "recipient_ids must be valid JSON array",
        });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.string().uuid("invalid user id")))
    .default([]),

    status: NotificationCampaignStatusEnum.optional()
});

/**
 * =========================
 * COMMON VALIDATION
 * =========================
 */
const campaignValidation = (data, ctx) => {
  if (data.channel_type === "EMAIL" || data.channel_type === "BOTH") {
    if (!data.subject) {
      ctx.addIssue({
        path: ["subject"],
        code: z.ZodIssueCode.custom,
        message: "subject is required for EMAIL",
      });
    }

    if (!data.body) {
      ctx.addIssue({
        path: ["body"],
        code: z.ZodIssueCode.custom,
        message: "body is required for EMAIL",
      });
    }
  }

  if (data.channel_type === "PUSH" || data.channel_type === "BOTH") {
    if (!data.title) {
      ctx.addIssue({
        path: ["title"],
        code: z.ZodIssueCode.custom,
        message: "title is required for PUSH",
      });
    }

    if (!data.message) {
      ctx.addIssue({
        path: ["message"],
        code: z.ZodIssueCode.custom,
        message: "message is required for PUSH",
      });
    }
  }

  /**
   * 🔹 SCHEDULE validation
   */
  if (data.schedule_type === "RECURRING") {
    if (!data.start_date) {
      ctx.addIssue({
        path: ["start_date"],
        code: z.ZodIssueCode.custom,
        message: "start_date is required for RECURRING",
      });
    }

    if (!data.end_date) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "end_date is required for RECURRING",
      });
    }

    if (!data.recurring_option) {
      ctx.addIssue({
        path: ["recurring_option"],
        code: z.ZodIssueCode.custom,
        message: "recurring_option is required for RECURRING",
      });
    }

    if (data.start_date && data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "end_date must be after start_date",
      });
    }
  }


  if (data.schedule_type !== "RECURRING" && data.recurring_option) {
    ctx.addIssue({
      path: ["recurring_option"],
      code: z.ZodIssueCode.custom,
      message: "recurring_option must be empty unless RECURRING",
    });
  }

  /**
   * 🔹 TARGET validation
   */
  if (data.target_type === "SPECIFIC_USERS" && data.recipient_ids.length === 0) {
    ctx.addIssue({
      path: ["recipient_ids"],
      code: z.ZodIssueCode.custom,
      message: "recipient_ids required for SPECIFIC_USERS",
    });
  }

  if (data.target_type !== "SPECIFIC_USERS" && data.recipient_ids.length > 0) {
    ctx.addIssue({
      path: ["recipient_ids"],
      code: z.ZodIssueCode.custom,
      message: "recipient_ids must be empty unless SPECIFIC_USERS",
    });
  }

  /**
   * 🔹 DATE validation
   */
  if (data.start_date && data.end_date) {
    if (new Date(data.end_date) < new Date(data.start_date)) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "end_date must be after start_date",
      });
    }
  }
};

/**
 * =========================
 * CREATE DRAFT
 * =========================
 */
export const createCampaignSchema = baseCampaignSchema
  .superRefine(campaignValidation)
  .refine(
    async (data) => {
      const existing = await prisma.notificationCampaign.findFirst({
        where: { name: data.name },
      });

      return !existing;
    },
    {
      path: ["name"],
      message: "Campaign with this name already exists",
    }
  );

/**
 * =========================
 * UPDATE DRAFT
 * =========================
 */
export const updateCampaignSchema = (id) =>
  baseCampaignSchema
  .partial()
  .superRefine(campaignValidation)
  .refine(
    async (data) => {
      if (!data.name) return true;

      const existing = await prisma.notificationCampaign.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      return !existing;
    },
    {
      path: ["name"],
      message: "Campaign with this name already exists",
    }
  );

export const updateNotificationCompaignStatusSchema = z.object({
  status: NotificationCampaignStatusEnum,
});