import express from 'express';
import authRoutes from '../mobile/auth/auth.routes.js';
import interestRoutes from '../mobile/interests/interests.routes.js';
import dashboardRoutes from '../mobile/dashboard/dashboard.routes.js';
import notificationSettingsRoutes from '../mobile/notification-settings/notification-settings.routes.js';
import staticPageRoutes from '../mobile/static-pages/static-page.routes.js';
import categoryRoutes from './category/category.routes.js';
import albumRoutes from './album/album.routes.js';
import trackRoutes from './tracks/tracks.routes.js';
import playlistRoutes from './playlist/playlist.routes.js';
import podcasterRoutes from './podcaster/podcaster.routes.js';
import reportContentRoutes from './report-content/report-content.routes.js';
import libraryRoutes from './library/library.routes.js';
import subscriptionRoutes from './subscription/subscription.routes.js'
import paymentRoutes from './payment/payment.routes.js';
import trackAnalyticsRoutes from './track-analytics/track-analytics.routes.js';
import notificationRoutes from "./notification/notification.routes.js"
import commonRoutes from "./common/common.routes.js"

const app = express();

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/interests', interestRoutes);
app.use('/dashboard',dashboardRoutes);
app.use('/notification-settings', notificationSettingsRoutes);
app.use('/static-pages', staticPageRoutes);
app.use('/category', categoryRoutes);
app.use('/album', albumRoutes);
app.use('/tracks', trackRoutes);
app.use('/playlist', playlistRoutes);
app.use('/podcaster', podcasterRoutes);
app.use('/report-content', reportContentRoutes);
app.use('/library', libraryRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/payment', paymentRoutes);
app.use('/track-analytics', trackAnalyticsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/common', commonRoutes);





export default app;
