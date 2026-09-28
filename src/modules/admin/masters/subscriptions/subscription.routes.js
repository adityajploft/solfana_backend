import { Router } from 'express';
import subscriptionController from './subscription.controller.js';
import { validate } from '../../../../common/middlewares/zod.middleware.js';
import {
  AssignSubscriptionSchema,
  CreateSubscriptionPlanSchema,
  RevokeSubscriptionSchema,
  UpdateSubscriptionPlanSchema,
} from './subscription.validator.js';
import { i18nMiddleware } from '../../../../common/middlewares/i18n.middleware.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN SUBSCRIPTION PLAN API's ================= */

router.post('/',validate(CreateSubscriptionPlanSchema),subscriptionController.create);
router.get('/history', subscriptionController.getSubscriptionHistory);
router.get('/',subscriptionController.list);
router.get('/:id',subscriptionController.getById);
router.put('/:id',validate(UpdateSubscriptionPlanSchema),subscriptionController.update);
router.delete('/:id',subscriptionController.delete);
router.patch('/:id/status', subscriptionController.toggleStatus);

/* ================= ADMIN ASSIGNED SUBSCRIPTION API's ================= */

router.post('/assign',validate(AssignSubscriptionSchema),subscriptionController.assignSubscription);
router.patch('/revoke',validate(RevokeSubscriptionSchema),subscriptionController.revokeSubscription);
router.get('/user/:userId',subscriptionController.getUserSubscription);



export default router;