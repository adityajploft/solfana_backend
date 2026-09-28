import { Router } from 'express';
import controller from './auth.controller.js';
import validate from '../../../../src/common/middlewares/validate.js';
import {
  loginWithPasswordValidator,
  forgotPasswordEmailValidator,
  verifyForgotPasswordOtpValidator,
  resetPasswordValidator,
  signupPhoneValidator,
  createPasswordValidator,
  saveInterestsValidator,
  logoutValidator,
  loginEmailValidator,
  verifyLoginOtpValidator,
  updateProfileValidator,
  changePasswordValidator,
} from './auth.validator.js';
import { authenticate } from './authenticate.js';
import { validateLanguage } from './validateLanguage.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';

import { authLimiter } from '../../../common/middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/login/email', authLimiter, loginEmailValidator, validate, controller.loginWithEmail);
router.post('/login/verify-otp', authLimiter, verifyLoginOtpValidator, validate, controller.verifyLoginOtp);
router.post('/login', authLimiter, loginWithPasswordValidator, validate, controller.loginWithPassword);

router.post('/signup/phone', authenticate, signupPhoneValidator, validate, controller.signupPhone);
router.post('/signup/create-password', authenticate, createPasswordValidator, validate, controller.createPassword);


router.post('/forgot-password/email', forgotPasswordEmailValidator, validate, controller.forgotPasswordEmail);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtpValidator, validate, controller.verifyForgotPasswordOtp);
router.post('/reset-password', resetPasswordValidator, validate, controller.resetPassword);

router.use(i18nMiddleware);

router.post('/logout', authenticate, logoutValidator, validate, controller.logout);

router.get('/me', authenticate, controller.me);

router.put('/update-profile', authenticate, uploadMiddleware.single('profileImage'), updateProfileValidator, validate, controller.updateProfile);

router.put('/user/language', authenticate, validateLanguage, controller.updateLanguage);

router.post('/change-password', authenticate, changePasswordValidator, validate, controller.changePassword);

router.post('/user/interests', authenticate, saveInterestsValidator, validate, controller.saveUserInterests);



export default router;