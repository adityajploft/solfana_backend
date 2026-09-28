import { Router } from 'express';
import { authenticate } from '../auth/authenticate.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import subscriptionController from './subscription.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.get('/plans', subscriptionController.customerPlanList);
router.get('/history', subscriptionController.mySubscriptionHistory);
router.post('/cancel/:subscriptionId', subscriptionController.cancelSubscription);



export default router;