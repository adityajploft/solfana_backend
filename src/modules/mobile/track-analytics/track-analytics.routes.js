import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import TrackAnalyticsController from './track-analytics.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);


router.post('/listen/start', TrackAnalyticsController.start);
router.post('/listen/progress', TrackAnalyticsController.progress);
router.get("/listen/status", TrackAnalyticsController.status);
router.post('/ads/reward', TrackAnalyticsController.reward);

router.post("/play", TrackAnalyticsController.playTrack);
router.get("/queue/next", TrackAnalyticsController.nextQueue);
router.get("/queue/prev", TrackAnalyticsController.prevQueue);





export default router;
