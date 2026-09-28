import { Job, Worker } from "bullmq";
import redis from '../../config/redis.config.js';
import { privacyUpdateNotificationHelper } from "./notification-worker-helpers/policy-update.js";
import { newReleaseNotificationHelper } from "./notification-worker-helpers/new-releases.js";
import { sendEmailNotificationHelper } from "./notification-worker-helpers/send-email.js";
import { sendPushNotificationHelper } from "./notification-worker-helpers/push-notification.js";
import { sendNotificationCampaignHelper } from "./notification-worker-helpers/notification-campaign.js";
import { WelcomeNotificationEmailHelper } from "./notification-worker-helpers/welcome-notification-email.js";

const worker = new Worker('notification-queue',

  async (job) => {
    if (job.name === 'policy-update') {
      await privacyUpdateNotificationHelper(job);
    }

    if (job.name === 'new-content-published') {
      await newReleaseNotificationHelper(job);
    }

    if (job.name === "send_email") {
      await sendEmailNotificationHelper(job);
    }

    if (job.name === "push_notification") {
      await sendPushNotificationHelper(job);
    }

    if (job.name === "notification_campaign") {
      await sendNotificationCampaignHelper(job);
    }

    if (job.name === "send-welcome-email-notification") {
      await WelcomeNotificationEmailHelper(job);
    }
  },
  { connection: redis }
);

worker.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job.id}`, err);
});