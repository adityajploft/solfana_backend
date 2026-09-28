import prisma from "../../../config/db.config.js";
import emailService from "../../services/email.service.js";
import { createNotification } from "../../services/notifications/notificationService.js";

export async function WelcomeNotificationEmailHelper(job) {
    const { admin, customer, lang } = job.data;

    await emailService.newCustomerRegistrationAdminMail(admin, customer, lang);

    // Send Notification to Admin
    await createNotification({
      receiverId: admin.id,
      receiverType: 'USER',

      notificationKey: "account_activity",

      moduleType: "customer",
      moduleId: customer.id,

      isClickable: true,
      clickAction: 'OPEN_URL',
      clickValue: "customer_list",

      lang: lang,

      data: {
        notificationkeyType: "NEW_CUSTOMER",
        type: "account_activity",
        moduleType: "customer",
        moduleId: customer.id,
        isClickable: true,
        clickAction: 'OPEN_URL',
        clickValue: "customer_list"
      },
      fcmToken: admin.fcmToken || null
    });
}