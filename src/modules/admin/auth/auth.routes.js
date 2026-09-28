import { Router } from "express";
import authController from './auth.controller.js';

import { validate } from "../../../common/middlewares/zod.middleware.js";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.validator.js";
import { authenticate } from "../../../common/middlewares/auth.middleware.js";

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authenticate, authController.logout);

router.put('/user/language', authenticate, authController.updateLanguage);

export default router;