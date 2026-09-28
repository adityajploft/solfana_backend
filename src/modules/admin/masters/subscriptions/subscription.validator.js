import { z } from 'zod';

export const CreateSubscriptionPlanSchema = z.object({
  name: z
    .string({
      required_error: 'SUBSCRIPTION_NAME_REQUIRED',
      invalid_type_error: 'SUBSCRIPTION_NAME_REQUIRED'
    })
    .trim()
    .min(1, 'SUBSCRIPTION_NAME_REQUIRED'),

  code: z.enum(['FREE', 'PREMIUM'], {
    errorMap: () => ({ message: 'INVALID_SUBSCRIPTION_CODE' })
  }),

  description: z.string().optional().nullable(),

  price: z
    .union([
      z.number({
        invalid_type_error: 'INVALID_PRICE'
      }),
      z.string()
    ])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'INVALID_PRICE'
    }),

  currency: z
    .string({
      required_error: 'CURRENCY_REQUIRED',
      invalid_type_error: 'CURRENCY_REQUIRED'
    })
    .trim()
    .min(1, 'CURRENCY_REQUIRED'),

  durationDays: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) =>
      val === null || val === undefined || val === ''
        ? null
        : Number(val)
    ),

  features: z
    .any({
      required_error: 'FEATURES_REQUIRED'
    })
    .transform((val, ctx) => {
      if (val === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FEATURES_REQUIRED'
        });
        return z.NEVER;
      }

      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'INVALID_FEATURES_JSON'
          });
          return z.NEVER;
        }
      }

      if (typeof val === 'object' && val !== null) {
        return val;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INVALID_FEATURES'
      });
      return z.NEVER;
    }),

  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .optional()
});


export const UpdateSubscriptionPlanSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'SUBSCRIPTION_NAME_REQUIRED'
    })
    .trim()
    .min(1, 'SUBSCRIPTION_NAME_REQUIRED')
    .optional(),

  // code: z
  //   .enum(['FREE', 'PREMIUM'], {
  //     errorMap: () => ({ message: 'INVALID_SUBSCRIPTION_CODE' })
  //   })
  //   .optional(),

  description: z.string().optional().nullable(),

  price: z
    .union([
      z.number({
        invalid_type_error: 'INVALID_PRICE'
      }),
      z.string()
    ])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'INVALID_PRICE'
    })
    .optional(),

  currency: z
    .string({
      invalid_type_error: 'CURRENCY_REQUIRED'
    })
    .trim()
    .min(1, 'CURRENCY_REQUIRED')
    .optional(),

  durationDays: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) =>
      val === null || val === undefined || val === ''
        ? null
        : Number(val)
    ),

  features: z
    .any()
    .optional()
    .transform((val, ctx) => {
      if (val === undefined) return undefined;

      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'INVALID_FEATURES_JSON'
          });
          return z.NEVER;
        }
      }

      if (typeof val === 'object' && val !== null) {
        return val;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INVALID_FEATURES'
      });
      return z.NEVER;
    }),

  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .optional()
});

export const AssignSubscriptionSchema = z.object({
  customerId: z.string().uuid('INVALID_CUSTOMER_ID'),
  planId: z.string().uuid('INVALID_PLAN_ID'),
  source: z.enum(['MANUAL', 'PROMO']),
  note: z.string().optional().nullable()
});

export const RevokeSubscriptionSchema = z.object({
  customerId: z.string().uuid('INVALID_CUSTOMER_ID'),
  note: z.string().optional()
});
