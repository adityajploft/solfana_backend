import prisma from "../../../config/db.config.js";
import HttpError from "../../../common/errors/http.error.js";
import { notificationQueue } from "../../../common/queues/notification.queue.js";
import { deleteFromCDNByUrl, uploadToCDN } from "../../../common/utils/globalUploader.js";

class EmailNotificationService {
  /**
   * =========================
   * CREATE EMAIL (DRAFT OR SEND IMMEDIATELY)
   * =========================
   */
  async create({ body, files = [], sendImmediately = false, senderId }) {
    try {
      // Get Attachment Url
      const finalAttachments = await Promise.all(
        files.map(async (file) => {
          const uploadResult = await uploadToCDN(file, "EMAIL_NOTIFICATION", "ATTACHMENTS", { optimize: false, deleteLocal: true });

          if (!uploadResult.success) {
            throw new HttpError(400, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track');
          }

          return uploadResult.cdnUrl.startsWith("http") ? uploadResult.cdnUrl : `https://${uploadResult.cdnUrl}`;
        })
      );

      let createData = {
          subject: body.subject,
          body: body.body,
          senderId: senderId,
          targetType: body.target_type,

          recipientIds: body.target_type === "SPECIFIC_USERS" ? body.recipient_ids || [] : [],

          attachmentUrls: finalAttachments,
        };

      if (sendImmediately) {
        createData.isSent = true;
        createData.sentAt = new Date();
      }

      const email = await prisma.emailNotification.create({
        data: createData,
      });

      if (sendImmediately) {
        await this.send(email.id);
      }

      return email;
    } catch (error) {
      throw error;
    }
  }

  async send(id) {
    try {
      const emailNotification = await prisma.emailNotification.findUnique({ where: { id } });

      if (!emailNotification) { throw new HttpError(404, "EMAIL_NOT_FOUND", "email_not_found", "email"); }

      // if (emailNotification.isSent) { throw new HttpError(400, "EMAIL_ALREADY_SENT", "email_already_sent", "email"); }

      const recipients = await this.resolveRecipients(emailNotification);

      if (!recipients.length) { throw new HttpError(400, "NO_RECIPIENTS_FOUND", "no_recipients_found", "email"); }

      const queueData = { emailId: emailNotification.id, subject: emailNotification.subject, body: emailNotification.body, attachments: emailNotification.attachmentUrls, recipients};

      await notificationQueue.add("send_email", queueData);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async resolveRecipients(emailNotification) {
    const now = new Date();
    const whereSubscription = {
      some: {
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ],
        plan: {
          code: "PREMIUM",
        },
      },
    };

    if (emailNotification.targetType === "ALL") {
      return prisma.customer.findMany({
        select: { id: true, email: true },
      });
    } else if (emailNotification.targetType === "FREE_USERS") {
      return prisma.customer.findMany({
        where: { NOT: { subscriptions: whereSubscription }, },
        select: { id: true, email: true },
      });
    } else if (emailNotification.targetType === "PREMIUM_USERS") {
      return prisma.customer.findMany({
        where: { subscriptions: whereSubscription, },
        select: { id: true, email: true },
      });
    } else if (emailNotification.targetType === "SPECIFIC_USERS") {
      return prisma.customer.findMany({
        where: { id: { in: emailNotification.recipientIds }, },
        select: { id: true, email: true },
      });
    }

    return [];
  }

  async update({id, body, files = [], sendImmediately}) {
    try {
      const existing = await prisma.emailNotification.findUnique({ where: { id } });

      if (!existing) { throw new HttpError(404, "EMAIL_NOT_FOUND", "email_not_found", "email"); }

      // if (existing.isSent) { throw new HttpError(400, "CANNOT_EDIT_SENT_EMAIL", "cannot_edit_sent_email", "email"); }

      let finalAttachments = existing.attachmentUrls || [];
      if (files && files.length > 0) {
        finalAttachments = await Promise.all(
          files.map(async (file) => {
            const uploadResult = await uploadToCDN(file, "EMAIL_NOTIFICATION", "ATTACHMENTS", { optimize: false, deleteLocal: true });

            if (!uploadResult.success) { throw new HttpError(400, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track'); }

            return uploadResult.cdnUrl.startsWith("http") ? uploadResult.cdnUrl : `https://${uploadResult.cdnUrl}`;
          })
        );
      }

      let updateData = {
        subject: body.subject ?? existing.subject,
        body: body.body ?? existing.body,
        targetType: body.target_type ?? existing.targetType,

        recipientIds: body.target_type === "SPECIFIC_USERS" ? body.recipient_ids || [] : body.target_type ? [] : existing.recipientIds,

        attachmentUrls: finalAttachments,
      };

      if (sendImmediately) {
        updateData.isSent = true;
        updateData.sentAt = new Date();
      }

      const updated = await prisma.emailNotification.update({
        where: { id },
        data: updateData
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  async markAsSent(emailId) {
    try {
      await prisma.emailNotification.update({
        where: { id: emailId },
        data: {
          isSent: true,
          sentAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async markAsFailed(emailId) {
    try {
      await prisma.emailNotification.update({
        where: { id: emailId },
        data: {
          isSent: false,
        },
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async list({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;

    const whereCondition = {
        subject: {
          contains: search,
          mode: 'insensitive',
        },
    };

    const emailNotifications = await prisma.emailNotification.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.emailNotification.count({
      where: whereCondition,
    });

    return {
      records: emailNotifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getById(emailId) {
    const emailNotification = await prisma.emailNotification.findUnique({
      where: { id: emailId },
    });

    if (!emailNotification) { throw new HttpError(404, "EMAIL_NOT_FOUND", "email_not_found", "email"); }

    return emailNotification;
  }

  async remove(id) {
    // check existing record
    const emailNotification = await prisma.emailNotification.findUnique({ where: { id } });

    if (!emailNotification) { throw new HttpError(404, "EMAIL_NOT_FOUND", "email_not_found", "email"); }

    // if (emailNotification.isSent) { throw new HttpError(400, "CANNOT_EDIT_SENT_EMAIL", "cannot_edit_sent_email", "email"); }

    // Remove Files from bunnycdn
    const attachments = emailNotification.attachmentUrls || [];
    await Promise.all(
      attachments.map((url) => deleteFromCDNByUrl(url))
    );


    await prisma.emailNotification.delete({ where: { id } });

    return true
  }
}

export default new EmailNotificationService();