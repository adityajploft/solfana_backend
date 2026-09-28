import prisma from "../../../config/db.config.js";
import EmailNotificationService from "../../../modules/admin/email-notification/email-notification.service.js";
import emailService from "../../services/email.service.js";

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

/**
 * =========================
 * BULK EMAIL HANDLER
 * =========================
 */
export const sendEmailNotificationHelper = async (job) => {
  const { emailId } = job.data;

  try {
    /**
     * 1. Fetch full email from DB (source of truth)
     */
    const emailNotification = await prisma.emailNotification.findUnique({
      where: { id: emailId },
    });

    if (!emailNotification) {
      throw new Error("EMAIL_NOT_FOUND");
    }

    /**
     * 2. Resolve recipients (central logic already in service)
     */
    const recipients = await EmailNotificationService.resolveRecipients(emailNotification);

    if (!recipients.length) {
      throw new Error("NO_RECIPIENTS_FOUND");
    }

    const batchSize = 50;

    /**
     * 3. Send in batches
     */
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      await Promise.all(
        batch.map((user) =>
          sendEmail({to: user.email, subject: emailNotification.subject, body: emailNotification.body, attachments: emailNotification.attachmentUrls || []})
        )
      );
    }

    /**
     * 4. Mark success
     */
    await EmailNotificationService.markAsSent(emailId);

    return true;
  } catch (error) {
    console.error("EMAIL HELPER ERROR:", error);

    await EmailNotificationService.markAsFailed(emailId);

    throw error;
  }
};