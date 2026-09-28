import prisma from "../../../config/db.config.js";
import HttpError from "../../../common/errors/http.error.js";
import { notificationQueue } from "../../../common/queues/notification.queue.js";
import { deleteFromCDNByUrl, uploadToCDN } from "../../../common/utils/globalUploader.js";

class NotificationCampaignService {
  async list({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;

    const whereCondition = {
        name: {
          contains: search,
          mode: 'insensitive',
        }
    };

    const notificationCampaigns = await prisma.notificationCampaign.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.notificationCampaign.count({
      where: whereCondition,
    });

    return {
      records: notificationCampaigns,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async create(body) {
    try {
      const isEmail = ["EMAIL", "BOTH"].includes(body.channel_type);
      const isPush = ["PUSH", "BOTH"].includes(body.channel_type);
      const isRecurring = body.schedule_type === "RECURRING";

      const notificationCampaign = await prisma.notificationCampaign.create({
        data: {
          name: body.name,
          description: body.description,

          channelType: body.channel_type,

          // If channel_type = EMAIL, BOTH
          subject: isEmail ? body.subject || null : null,
          body: isEmail ? body.body || null : null,

          // If channel_type = PUSH, BOTH
          title: isPush ? body.title || null : null,
          message: isPush ? body.message || null : null,

          startDate: isRecurring && body.start_date ? new Date(body.start_date) : null,

          endDate: isRecurring && body.end_date ? new Date(body.end_date) : null,
          
          scheduleType: body.schedule_type,
          recurringOption: isRecurring ? body.recurring_option || null : null,

          targetType: body.target_type,

          recipientIds: body.target_type === "SPECIFIC_USERS" ? body.recipient_ids || [] : [],

          status: body.status
        },
      });

      if(!isRecurring){
        // Send Notifications
        const updated = await prisma.notificationCampaign.updateMany({
          where: { id: notificationCampaign.id },
          data: { lastRunAt: new Date() }
        });

        const users = await resolveUsers(notificationCampaign);
        
        if (!users.length) return;
      
        // PUSH
        if (["PUSH", "BOTH"].includes(notificationCampaign.channelType)) {
          const queuePushData = { type: "push", campaignData : {id: notificationCampaign.id, title: notificationCampaign.title, message: notificationCampaign.message, recipients: users} };
          
          await notificationQueue.add("notification_campaign", queuePushData);
        }
      
        // EMAIL
        if (["EMAIL", "BOTH"].includes(notificationCampaign.channelType)) {
          const queueEmailData = { type: "email", campaignData : {id: notificationCampaign.id, subject: notificationCampaign.subject, body: notificationCampaign.body, recipients: users} };
          
          await notificationQueue.add("notification_campaign", queueEmailData);
        }
      }
      return notificationCampaign;
    } catch (error) {
      throw error;
    }
  }

  async update({id, body }) {
    try {
      const isEmail = ["EMAIL", "BOTH"].includes(body.channel_type);
      const isPush = ["PUSH", "BOTH"].includes(body.channel_type);
      const isRecurring = body.schedule_type === "RECURRING";

      const notificationCampaign = await prisma.notificationCampaign.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description,

          channelType: body.channel_type,

          // If channel_type = EMAIL, BOTH
          subject: isEmail ? body.subject || null : null,
          body: isEmail ? body.body || null : null,

          // If channel_type = PUSH, BOTH
          title: isPush ? body.title || null : null,
          message: isPush ? body.message || null : null,

          // Recurring schedule fields
          startDate: isRecurring && body.start_date ? new Date(body.start_date) : null,
          endDate: isRecurring && body.end_date ? new Date(body.end_date) : null,

          scheduleType: body.schedule_type,

          recurringOption: isRecurring ? body.recurring_option || null : null,

          targetType: body.target_type,

          recipientIds: body.target_type === "SPECIFIC_USERS" ? body.recipient_ids || [] : [],

          status: body.status
        },
      });

      return notificationCampaign;
    } catch (error) {
      throw error;
    }
  }

  async show(id) {
    const notificationCampaign = await prisma.notificationCampaign.findUnique({
      where: { id },
    });

    if (!notificationCampaign) { throw new HttpError(404, "EMAIL_NOT_FOUND", "email_not_found", "email"); }

    return notificationCampaign;
  }

  async remove(id) {
    // check existing record
    const notificationCampaign = await prisma.notificationCampaign.findUnique({ where: { id } });

    if (!notificationCampaign) { throw new HttpError(404, "EMAIL_NOT_FOUND", "email_not_found", "email"); }

    await prisma.notificationCampaign.delete({ where: { id } });

    return true
  }

  async changeStatus(id, status) {
    // check existing record
    const notificationCampaign = await prisma.notificationCampaign.findFirst({ where: { id } });

    if (!notificationCampaign) {
      throw new HttpError(404, 'ADCAMPAIGN_NOT_FOUND', 'ad_campaign_not_found', 'ad-campaign');
    }

    await prisma.notificationCampaign.update({ where: { id }, data: { status: status } });

    return true
  }
}

async function resolveUsers(notificationCampaign) {
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

  if (notificationCampaign.targetType === "ALL") {
    return prisma.customer.findMany({
      select: selectColumns,
    });
  } else if (notificationCampaign.targetType === "FREE_USERS") {
    return prisma.customer.findMany({
      where: { NOT: { subscriptions: whereSubscription }, },
      select: selectColumns,
    });
  } else if (notificationCampaign.targetType === "PREMIUM_USERS") {
    return prisma.customer.findMany({
      where: { subscriptions: whereSubscription, },
      select: selectColumns,
    });
  } else if (notificationCampaign.targetType === "SPECIFIC_USERS") {
    return prisma.customer.findMany({
      where: { id: { in: notificationCampaign.recipientIds }, },
      select: selectColumns,
    });
  }

  return [];
}

export default new NotificationCampaignService();