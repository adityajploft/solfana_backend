import { z } from 'zod';

export const updateContentValidator = z.object({
  en: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
  }).optional(),

  fr: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
  }).optional(),
  notify_user: z.string().optional(),
});

export const supportValidator = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
});