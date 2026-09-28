import rateLimit from "express-rate-limit";

/**
 * Global API limiter
 */
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error_type: "rate_limit_error",
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Auth limiter
 * Login/Register/Forgot Password/OTP
 */
export const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,  // 2 minute
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    return req.body.email;
  },

  message: {
    success: false,
    error_type: "auth_rate_limit_error",
    message: "Too many authentication attempts. Please try again after.",
  },
});