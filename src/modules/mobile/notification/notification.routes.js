import { Router } from 'express';
import NotificationController from './notification.controller.js';
import { authenticate } from '../auth/authenticate.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.get('/', NotificationController.index);
router.post('/:id/mark-read', NotificationController.readNotification);
router.post('/mark-read-all', NotificationController.markNotificationReadAll);

export default router;