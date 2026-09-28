import cron from "node-cron";
import dayjs from "dayjs";
import prisma from "../../config/db.config.js";
import { notificationQueue } from "../queues/notification.queue.js";

export const notificationCampaignCron = () => {

  // Runs the cron job every 15 minutes between 4:00 AM and 11:45 PM every day.
  // cron.schedule("* * * * *", async () => {
  cron.schedule("*/15 4-23 * * *", async () => {
    console.log("⏰ Campaign cron running...");

    try {
      await runCampaignCron();
      console.log("⏰ Campaign cron end...");
    } catch (err) {
      console.error("❌ Campaign cron error:", err);
    }
  });

};

// Main Function to Run Cron
async function runCampaignCron() {
  const now = dayjs();
  const startOfToday = now.startOf("day").toDate();

  const campaigns = await prisma.notificationCampaign.findMany({
    where: {
      status: "ACTIVE",
      scheduleType: "RECURRING",

      // Active date range
      startDate: { lte: now.toDate() },
      OR: [
        { endDate: null },
        { endDate: { gte: now.toDate() } }
      ],

      // Not executed today
      OR: [
        { lastRunAt: null },
        { lastRunAt: { lt: startOfToday } }
      ]
    }
  });

  for (const campaign of campaigns) {
    const shouldRun = shouldRunToday(campaign, now);

    if (!shouldRun) continue;

    // Prevent duplicate execution (important in multi-instance)
    const updated = await prisma.notificationCampaign.updateMany({
      where: {
        id: campaign.id,
        OR: [
          { lastRunAt: null },
          { lastRunAt: { lt: startOfToday } }
        ]
      },
      data: {
        lastRunAt: new Date()
      }
    });

    // If already updated by another process → skip
    if (updated.count === 0) continue;

    // Execute campaign
    await runCampaign(campaign, now);

    // Auto-complete campaign if ended
    if (campaign.endDate && now.isAfter(dayjs(campaign.endDate), "day")) {
      await prisma.notificationCampaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED" }
      });
    }
  }
}

// Check Need to Run Today
function shouldRunToday(campaign, now) {
  const startDate = campaign.startDate ? dayjs(campaign.startDate) : null;

  if (!startDate) return false;

  switch (campaign.recurringOption) {
    case "DAILY":
      return true;

    case "WEEKLY":
      return now.day() === startDate.day();

    case "MONTHLY": {
      const targetDate = Math.min(startDate.date(), now.daysInMonth());
      return now.date() === targetDate;
    }

    default:
      return false;
  }
}

// Run Send Notification Campaign
async function runCampaign(campaign, now) {
  const users = await resolveUsers(campaign);

  if (!users.length) return;

  // PUSH
  if (["PUSH", "BOTH"].includes(campaign.channelType)) {
    const queuePushData = { type: "push", campaignData : {id: campaign.id, title: campaign.title, message: campaign.message, recipients: users} };
    
    await notificationQueue.add("notification_campaign", queuePushData);
  }

  // EMAIL
  if (["EMAIL", "BOTH"].includes(campaign.channelType)) {
    const queueEmailData = { type: "email", campaignData : {id: campaign.id, subject: campaign.subject, body: campaign.body, recipients: users} };
    
    await notificationQueue.add("notification_campaign", queueEmailData);
  }

  console.log(`✅ Campaign executed: ${campaign.name}`);
}

// Get Users
async function resolveUsers(campaign) {
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

  if (campaign.targetType === "ALL") {
    return prisma.customer.findMany({
      select: selectColumns,
    });
  } else if (campaign.targetType === "FREE_USERS") {
    return prisma.customer.findMany({
      where: { NOT: { subscriptions: whereSubscription }, },
      select: selectColumns,
    });
  } else if (campaign.targetType === "PREMIUM_USERS") {
    return prisma.customer.findMany({
      where: { subscriptions: whereSubscription, },
      select: selectColumns,
    });
  } else if (campaign.targetType === "SPECIFIC_USERS") {
    return prisma.customer.findMany({
      where: { id: { in: campaign.recipientIds }, },
      select: selectColumns,
    });
  }

  return [];
}