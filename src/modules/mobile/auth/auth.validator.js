import { body } from 'express-validator';

export const loginEmailValidator = [
  body('email').isEmail(),
];

// Verify Login OTP validator
export const verifyLoginOtpValidator = [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('deviceId').notEmpty(),
  body('firebaseToken').optional(),
];

// Login with Password validator
export const loginWithPasswordValidator = [
  body('email').isEmail(),
  body('password').notEmpty(),
  body('deviceId').notEmpty(),
  body('firebaseToken').optional(),
];

// Forgot Password Email validator
export const forgotPasswordEmailValidator = [
  body('email').isEmail(),
];

// Verify Forgot Password OTP validator
export const verifyForgotPasswordOtpValidator = [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
];

// Reset Password validator
export const resetPasswordValidator = [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

// Signup Phone validator
export const signupPhoneValidator = [
  body('phone_number').isLength({ min: 10, max: 15 }),
];

// Create Password validator
export const createPasswordValidator = [
  body('password').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

// Save Interests validator
export const saveInterestsValidator = [
  body('interest_ids').isArray({ min: 1 }),
  body('interest_ids.*').isString().isLength({ min: 1 }),
];

// Logout validator
export const logoutValidator = [
  body('deviceId').optional().isString(),
];

export const updateProfileValidator = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be between 10 and 15 digits'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address')
];

export const changePasswordValidator = [
  body('oldPassword').notEmpty().withMessage('OLD_PASSWORD_REQUIRED'),
  body('newPassword').isLength({ min: 6 }).withMessage('NEW_PASSWORD_INVALID'),
  body('confirmPassword')
    .notEmpty().withMessage('CONFIRM_PASSWORD_REQUIRED')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('PASSWORDS_DO_NOT_MATCH');
      }
      return true;
    }),
];