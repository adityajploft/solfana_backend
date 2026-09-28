import { Router } from 'express';
import controller from './interests.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';

const router = Router();
router.use(i18nMiddleware)

router.get('/', authenticate, controller.findAll);

export default router;
