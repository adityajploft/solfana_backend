import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import podcasterController from './podcaster.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);


router.get('/profile/:id', podcasterController.getPodcasterProfile);
router.post('/toggle-follow', podcasterController.toggleFollow);
router.get('/followed-podcasters', podcasterController.getFollowedPodcasters);








export default router;
