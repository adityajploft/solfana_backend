import prisma from "../../../config/db.config.js";
import PushNotificationService from "../../../modules/admin/push-notification/push-notification.service.js";
import { createNotification } from "../../services/notifications/notificationService.js";

export async function sendPushNotificationHelper(job) {
    const { module, title, message, recipients } = job.data;

    // Map notification key
    const notificationKey = "app_updates";

    const batchSize = 100;

    for (let i = 0; i < recipients.length; i += batchSize) {

      const batch = recipients.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (customer) => {

          // SAVE TO DB
          await createNotification({
            receiverId: customer.id,
            receiverType: 'CUSTOMER',

            notificationKey,

            moduleType: null,
            moduleId: null,

            isClickable: true,
            clickAction: module.actionType,
            clickValue: module.internalScreen, // frontend will route

            lang: customer.language?.lang || 'fr',

            data: {
              messageData: {
                title: module.title,
                description: module.message,
              },
              isClickable: true,
              clickAction: module.actionType,
              clickValue: module.internalScreen
            },
            fcmToken: customer.fcmToken
          });
        })
      );
    }

    await PushNotificationService.markAsSent(module.id);

    console.log(`✅ Push notification sent`);
}