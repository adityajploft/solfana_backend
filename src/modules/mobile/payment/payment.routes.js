import express, { Router } from 'express';
import { authenticate } from '../auth/authenticate.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import PaymentController from './payment.controller.js';
import { validateInitiatePayment } from './payment.validator.js';

const router = Router();

router.use(i18nMiddleware);

// Check payment status (optional)
router.get("/verify", PaymentController.verifyPayment);
// router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.webhook);

router.use(authenticate);

router.post('/initiate', validateInitiatePayment, PaymentController.initiatePayment);



export default router;