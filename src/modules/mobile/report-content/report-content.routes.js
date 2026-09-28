import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import ReportContentController from './report-content.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);


router.get('/', ReportContentController.getReportReasons);
router.post('/', ReportContentController.reportContent);








export default router;
