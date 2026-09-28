import { Router } from 'express';
import DashboardController from './dashboard.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import dashboardController from './dashboard.controller.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN ALBUM ================= */
router.get('/', DashboardController.getCounts);

// Graphs
router.get('/graphs/listening-time', DashboardController.getListeningTimeGraph);
router.get('/graphs/user-growth', DashboardController.getUserGrowthGraph);
router.get('/graphs/conversion-rate', DashboardController.getConversionGraph);

// Insights
router.get('/insights/top-tracks', DashboardController.getTopTracks);
router.get('/insights/listening-per-user', DashboardController.getListeningPerUser);

// Storage
router.get('/storage-usage', dashboardController.getStorageUsage)

export default router;