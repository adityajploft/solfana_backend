import { Router } from "express";
import adminAuthRoutes from './auth/auth.routes.js';
import permissonRoutes from './permissions/permission.routes.js';
import roleRoutes from './roles/role.routes.js'
import userRoutes from './users/user.routes.js'
import profileRoutes from './profile/profile.routes.js'
import categoryRoutes from './masters/categories/category.routes.js'
import subCategoryRoutes from './masters/subcategories/subcategory.routes.js'
import levelCategoryRoutes from './masters/level-category/level-category.route.js'
import podcasterRoutes from './podcasters/podcaster.routes.js';
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import settingRoutes from "./settings/settings.routes.js";
import uploadRoutes from "./uploads/upload.routes.js"
import albumRoutes from '../admin/albums/album.routes.js';
import audioLibraryRoutes from '../admin/audio-libraries/audio-libraries.routes.js';
import tracksRoutes from '../admin/tracks/track.routes.js';
import customerRoutes from '../admin/customers/customer.routes.js';
import subscriptionRoutes from '../admin/masters/subscriptions/subscription.routes.js';
import dashboardRoutes from '../admin/dashboard/dashboard.routes.js';
import transactionRoutes from '../admin/transactions/transactions.routes.js';
import contentReportRoutes from '../admin/content-reports/content-reports.routes.js';
import notificationRoutes from '../admin/notification/notification.routes.js';
import audioAdsRoutes from '../admin/audio-ads/audio-ad.routes.js';
import bannerRoutes from '../admin/banner/banner.routes.js';
import adCampaignRoutes from '../admin/ad-campaign/ad-campaign.routes.js';
import emailNotificationRoutes from '../admin/email-notification/email-notification.routes.js';
import pushNotificationRoutes from '../admin/push-notification/push-notification.routes.js';
import notificationCampaignRoutes from '../admin/notification-campaign/notification-campaign.routes.js';

const router = Router();

/* ================= PUBLIC ROUTES ================= */
router.use('/auth', adminAuthRoutes);

/* ================= PROTECTED ROUTES ================= */
router.use(authenticate);


router.use('/permissions', permissonRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/categories', categoryRoutes);
router.use('/sub-categories', subCategoryRoutes);
router.use('/level-categories', levelCategoryRoutes);
router.use('/podcasters', podcasterRoutes);
router.use('/settings',settingRoutes);
router.use('/uploads',uploadRoutes);
router.use('/albums',albumRoutes);
router.use('/tracks',tracksRoutes);
router.use('/audio-libraries',audioLibraryRoutes);
router.use('/customers',customerRoutes);
router.use('/subscriptions',subscriptionRoutes);
router.use('/dashboard',dashboardRoutes);
router.use('/transactions',transactionRoutes);
router.use('/content-reports',contentReportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audio-ads', audioAdsRoutes);
router.use('/banners', bannerRoutes);
router.use('/ad-campaigns', adCampaignRoutes);
router.use('/email-notifications', emailNotificationRoutes);
router.use('/push-notifications', pushNotificationRoutes);
router.use('/notification-campaigns', notificationCampaignRoutes);



export default router;