import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import trackController from './tracks.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.get('/detail/:id',authenticate,trackController.TrackDetails);







export default router;
