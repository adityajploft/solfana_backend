import prisma from "../../../config/db.config.js";
import EmailNotificationService from "../../../modules/admin/email-notification/email-notification.service.js";
import emailService from "../../services/email.service.js";
import { createNotification } from "../../services/notifications/notificationService.js";

/**
 * Replace this with real provider:
 * SendGrid / SES / SMTP
 */
async function sendEmail({ to, subject, body, attachments }) {
  console.log("Sending email →", to);  
  await emailService.sendMailFromEmailNotification(to, subject, body, attachments);

  // TODO: integrate provider
  return true;
}

export const sendNotificationCampaignHelper = async (job) => {
  const { type, campaignData } = job.data;

  try {
    const recipients = campaignData.recipients || [];
    const batchSize = 100;

    if(type === "push"){
      console.log("Sending Push Notification");

      const notificationKey = "app_updates";
    
      for (let i = 0; i < recipients.length; i += batchSize) {
  
        const batch = recipients.slice(i, i + batchSize);
  
        await Promise.all(
          batch.map(async (customer) => {
  
            // SAVE TO DB
            await createNotification({
              receiverId: customer.id,
              receiverType: 'CUSTOMER',
  
              notificationKey,    
  
              lang: customer.language?.lang || 'fr',
  
              data: {
                messageData: {
                  title: campaignData.title,
                  description: campaignData.message,
                },
                isClickable: false,
                clickAction: "NONE",
                clickValue: null
              },
              fcmToken: customer.fcmToken
            });
          })
        );
      }
    } else if(type === "email"){
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        await Promise.all(
          batch.map((user) =>
            sendEmail({ to: user.email, subject: campaignData.subject, body: campaignData.body, attachments: [] })
          )
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Notification HELPER ERROR:", error);
    throw error;
  }
};