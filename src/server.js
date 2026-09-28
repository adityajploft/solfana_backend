import 'dotenv/config';
import app from './app.js';
import { startAlbumPublishCron } from './common/cron/albumPublish.cron.js';
import { subscriptionCrons } from './common/cron/subscription.cron.js';
import { notificationCampaignCron } from './common/cron/notificationCampaign.cron.js';


const PORT = process.env.PORT || 3005;

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on port ${PORT}`);

  // Cron Jobs
  startAlbumPublishCron();
  subscriptionCrons();
  notificationCampaignCron();
});
