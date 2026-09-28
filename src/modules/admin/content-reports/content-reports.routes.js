import { Router } from 'express';
import ContentReportController from './content-reports.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware);

router.get('/', checkPermission('content-report','read'), ContentReportController.index);

router.get('/:id', checkPermission('content-report','read'),ContentReportController.show);

export default router;