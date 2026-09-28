import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import transactionController from './transactions.controller.js';

const router = Router();
router.use(i18nMiddleware)

router.get('/', transactionController.list);
router.get('/:id', transactionController.detail);

export default router;
