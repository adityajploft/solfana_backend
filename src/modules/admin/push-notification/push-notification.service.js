import prisma from "../../../config/db.config.js";
import HttpError from "../../../common/errors/http.error.js";
import { notificationQueue } from "../../../common/queues/notification.queue.js";
import { deleteFromCDNByUrl, uploadToCDN } from "../../../common/utils/globalUploader.js";

class PushNotificationService {
  
  async create({ body, sendImmediately = false, senderId }) {
    try {
      let createData = {
        title: body.title,
        message: body.message,
        senderId: senderId,
        targetType: body.target_type,

        recipientIds: body.target_type === "SPECIFIC_USERS" ? body.recipient_ids || [] : [],
        
        actionType: body.action_type,
        internalScreen: body.action_type === "OPEN_SCREEN" ? body.internal_screen || null : null,
      };

      if (sendImmediately) {
        createData.isSent = true;
        createData.sentAt = new Date();
      }

      const pushNotification = await prisma.pushNotification.create({
        data: createData,
      });

      if (sendImmediately) {
        await this.send(pushNotification.id);
      }

      return pushNotification;
    } catch (error) {
      throw error;
    }
  }

  async send(id) {
    try {
      const pushNotification = await prisma.pushNotification.findUnique({ where: { id } });

      if (!pushNotification) { throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "notification"); }

      // if (pushNotification.isSent) { throw new HttpError(400, "NOTIFICATION_ALREADY_SENT", "notification_already_sent", "notification"); }

      const recipients = await this.resolveRecipients(pushNotification);

      if (!recipients.length) { throw new HttpError(400, "NO_RECIPIENTS_FOUND", "no_recipients_found", "notification"); }

      const queueData = { module: pushNotification, title: pushNotification.title, message: pushNotification.message, recipients};

      await notificationQueue.add("push_notification", queueData);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async resolveRecipients(pushNotification) {
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

    const selectColumns = { id: true, email: true, fcmToken: true };

    if (pushNotification.targetType === "ALL") {
      return prisma.customer.findMany({
        select: selectColumns,
      });
    } else if (pushNotification.targetType === "FREE_USERS") {
      return prisma.customer.findMany({
        where: { NOT: { subscriptions: whereSubscription }, },
        select: selectColumns,
      });
    } else if (pushNotification.targetType === "PREMIUM_USERS") {
      return prisma.customer.findMany({
        where: { subscriptions: whereSubscription, },
        select: selectColumns,
      });
    } else if (pushNotification.targetType === "SPECIFIC_USERS") {
      return prisma.customer.findMany({
        where: { id: { in: pushNotification.recipientIds }, },
        select: selectColumns,
      });
    }

    return [];
  }

  async update({id, body, sendImmediately = false}) {
    try {
      const pushNotification = await prisma.pushNotification.findUnique({ where: { id } });

      if (!pushNotification) { throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "notification"); }

      if (pushNotification.isSent) { throw new HttpError(400, "CANNOT_EDIT_SENT_NOTIFICATION", "cannot_edit_sent_notification", "notification"); }

      let updateData = {
        title: body.title ?? pushNotification.title,
        message: body.message ?? pushNotification.message,
        targetType: body.target_type ?? pushNotification.targetType,

        recipientIds: body.target_type === "SPECIFIC_USERS" ? body.recipient_ids || [] : body.target_type ? [] : pushNotification.recipientIds,

        actionType: body.action_type ?? pushNotification.actionType,
        internalScreen: body.action_type === "OPEN_SCREEN" ? body.internal_screen ?? null : body.action_type ? null : pushNotification.internalScreen,
      };

      if (sendImmediately) {
        updateData.isSent = true;
        updateData.sentAt = new Date();
      }
      const updated = await prisma.pushNotification.update({
        where: { id },
        data: updateData
      });

      if (sendImmediately) {
        await this.send(pushNotification.id);
      }

      return updated;
    } catch (error) {
      throw error;
    }
  }

  async markAsSent(notificationId) {
    try {
      await prisma.pushNotification.update({
        where: { id: notificationId },
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

  async markAsFailed(notificationId) {
    try {
      await prisma.pushNotification.update({
        where: { id: notificationId },
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
        title: {
          contains: search,
          mode: 'insensitive',
        },
    };

    const pushNotifications = await prisma.pushNotification.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.pushNotification.count({
      where: whereCondition,
    });

    return {
      records: pushNotifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getById(id) {
    const pushNotification = await prisma.pushNotification.findUnique({
      where: { id },
    });

    if (!pushNotification) { throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "notification"); }

    return pushNotification;
  }

  async remove(id) {
    // check existing record
    const pushNotification = await prisma.pushNotification.findUnique({ where: { id } });

    if (!pushNotification) { throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "notification"); }

    // if (pushNotification.isSent) { throw new HttpError(400, "CANNOT_EDIT_SENT_NOTIFICATION", "cannot_edit_sent_notification", "notification"); }

    await prisma.pushNotification.delete({ where: { id } });

    return true
  }
}

export default new PushNotificationService();