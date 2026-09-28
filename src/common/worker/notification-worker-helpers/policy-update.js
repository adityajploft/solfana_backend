import prisma from "../../../config/db.config.js";
import { createNotification } from "../../services/notifications/notificationService.js";

export async function privacyUpdateNotificationHelper(job) {
    const { type } = job.data;

    // Map notification key
    const notificationKey = "security_policy";

    const customers = await prisma.customer.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, fcmToken: true, language: { select: { lang: true } } }
    });

    const batchSize = 100;

    for (let i = 0; i < customers.length; i += batchSize) {

      const batch = customers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (customer) => {

          // SAVE TO DB
          await createNotification({
            receiverId: customer.id,
            receiverType: 'CUSTOMER',

            notificationKey,

            moduleType: type,
            moduleId: null,

            isClickable: true,
            clickAction: 'OPEN_SCREEN',
            clickValue: type, // frontend will route

            lang: customer.language?.lang || 'fr',
            fcmToken: customer.fcmToken,
            data: {
              type
            }
          });
        })
      );
    }

    console.log(`✅ Policy update notification sent for: ${type}`);
}