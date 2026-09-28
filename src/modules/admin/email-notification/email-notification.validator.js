import { z } from "zod";
import prisma from "../../../config/db.config.js";

/**
 * =========================
 * ENUMS
 * =========================
 */
export const EmailTargetTypeEnum = z.enum([
  "FREE_USERS",
  "PREMIUM_USERS",
  "ALL",
  "SPECIFIC_USERS",
]);

/**
 * =========================
 * BASE SCHEMA
 * =========================
 */
const baseEmailSchema = z.object({
  subject: z.string().min(1, "subject is required"),

  body: z.string().min(1, "email body is required"),

  // sender_id: z.string().uuid("invalid sender_id"),

  target_type: EmailTargetTypeEnum,

  /**
   * RECIPIENT IDS
   */
  recipient_ids: z
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val) return [];

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
});

/**
 * =========================
 * COMMON VALIDATION
 * =========================
 */
const recipientValidation = (data, ctx) => {
  if (
    data.target_type === "SPECIFIC_USERS" &&
    data.recipient_ids.length === 0
  ) {
    ctx.addIssue({
      path: ["recipient_ids"],
      code: z.ZodIssueCode.custom,
      message: "recipient_ids required for SPECIFIC_USERS",
    });
  }

  if (
    data.target_type !== "SPECIFIC_USERS" &&
    data.recipient_ids.length > 0
  ) {
    ctx.addIssue({
      path: ["recipient_ids"],
      code: z.ZodIssueCode.custom,
      message: "recipient_ids must be empty unless SPECIFIC_USERS",
    });
  }
};

/**
 * =========================
 * CREATE DRAFT
 * =========================
 */
export const createEmailDraftSchema = baseEmailSchema
  .superRefine(recipientValidation)
  /* .refine(
    async (data) => {
      const existing = await prisma.emailNotification.findFirst({
        where: {
          subject: data.subject,
          senderId: data.sender_id,
        },
      });

      return !existing;
    },
    {
      path: ["subject"],
      message: "Email with this subject already exists for this sender",
    }
  ) */;

/**
 * =========================
 * CREATE + SEND
 * =========================
 */
export const createAndSendEmailSchema =
  baseEmailSchema.superRefine(recipientValidation);

/**
 * =========================
 * SEND DRAFT
 * =========================
 */
export const sendEmailSchema = z.object({
  email_id: z.string().uuid("invalid email_id"),
});

/**
 * =========================
 * UPDATE DRAFT
 * =========================
 */
export const updateEmailSchema = baseEmailSchema
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.target_type === "SPECIFIC_USERS" &&
      data.recipient_ids &&
      data.recipient_ids.length === 0
    ) {
      ctx.addIssue({
        path: ["recipient_ids"],
        code: z.ZodIssueCode.custom,
        message: "recipient_ids required for SPECIFIC_USERS",
      });
    }

    if (
      data.target_type &&
      data.target_type !== "SPECIFIC_USERS" &&
      data.recipient_ids &&
      data.recipient_ids.length > 0
    ) {
      ctx.addIssue({
        path: ["recipient_ids"],
        code: z.ZodIssueCode.custom,
        message: "recipient_ids must be empty unless SPECIFIC_USERS",
      });
    }
  });