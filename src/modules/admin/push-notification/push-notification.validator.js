import { z } from "zod";
import prisma from "../../../config/db.config.js";

/**
 * =========================
 * ENUMS
 * =========================
 */
export const targetTypeEnum = z.enum([
  "FREE_USERS",
  "PREMIUM_USERS",
  "ALL",
  "SPECIFIC_USERS",
]);

const PushNotificationActionTypeEnum = z.enum(["OPEN_APP", "OPEN_SCREEN"]);

/**
 * =========================
 * BASE SCHEMA
 * =========================
 */
const baseEmailSchema = z.object({
  title: z.string().min(1, "Title is required"),

  message: z.string().min(1, "Message is required"),

  target_type: targetTypeEnum,

  /**
   * RECIPIENT IDS
   */
  recipient_ids: z
  .union([
    z.string(),
    z.array(z.string())
  ])
  .optional()
  .transform((val, ctx) => {
    if (!val) return [];

    // If already array → return as-is
    if (Array.isArray(val)) return val;

    // If string → parse
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

  action_type: PushNotificationActionTypeEnum,

  internal_screen: z.string().optional(),
});

/**
 * =========================
 * COMMON VALIDATION
 * =========================
 */
const recipientValidation = (data, ctx) => {
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

  if (data.action_type === "OPEN_SCREEN" && !data.internal_screen) {
    ctx.addIssue({
      path: ["internal_screen"],
      code: z.ZodIssueCode.custom,
      message: "internal_screen required for OPEN_SCREEN",
    });
  }

  if (data.action_type !== "OPEN_SCREEN" && data.internal_screen) {
    ctx.addIssue({
      path: ["internal_screen"],
      code: z.ZodIssueCode.custom,
      message: "internal_screen must be empty unless OPEN_SCREEN",
    });
  }
};

/**
 * =========================
 * CREATE DRAFT
 * =========================
 */
export const createPushNotificationDraftSchema = baseEmailSchema
  .superRefine(recipientValidation)
  /* .refine(
    async (data) => {
      const existing = await prisma.pushNotification.findFirst({
        where: {
          title: data.title
        },
      });

      return !existing;
    },
    {
      path: ["title"],
      message: "Push Notification with this title already exists",
    }
  ) */;

/**
 * =========================
 * CREATE + SEND
 * =========================
 */
export const createAndSendPushNotificationSchema = baseEmailSchema.superRefine(recipientValidation);


/**
 * =========================
 * UPDATE DRAFT
 * =========================
 */
export const updatePushNotificationSchema = baseEmailSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.target_type === "SPECIFIC_USERS" && data.recipient_ids && data.recipient_ids.length === 0) {
      ctx.addIssue({
        path: ["recipient_ids"],
        code: z.ZodIssueCode.custom,
        message: "recipient_ids required for SPECIFIC_USERS",
      });
    }

    if (data.target_type && data.target_type !== "SPECIFIC_USERS" && data.recipient_ids && data.recipient_ids.length > 0) {
      ctx.addIssue({
        path: ["recipient_ids"],
        code: z.ZodIssueCode.custom,
        message: "recipient_ids must be empty unless SPECIFIC_USERS",
      });
    }

    if (data.action_type === "OPEN_SCREEN" && !data.internal_screen) {
      ctx.addIssue({
        path: ["internal_screen"],
        code: z.ZodIssueCode.custom,
        message: "internal_screen required for OPEN_SCREEN",
      });
    }

    if (data.action_type !== "OPEN_SCREEN" && data.internal_screen) {
      ctx.addIssue({
        path: ["internal_screen"],
        code: z.ZodIssueCode.custom,
        message: "internal_screen must be empty unless OPEN_SCREEN",
      });
    }
  });