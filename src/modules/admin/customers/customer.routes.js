import { Router } from 'express';
import customerController from './customer.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware);

router.get('/', checkPermission('customer','read'), customerController.index);

router.get('/:id', checkPermission('customer','read'),customerController.show);

router.delete('/:id', checkPermission('customer','delete'),customerController.delete);

router.patch('/:id/toggle-status', checkPermission('customer','update'),customerController.toggleStatus);

export default router;