import cron from 'node-cron';
import prisma from '../../../config/db.config.js';
import dayjs from 'dayjs';
import EmailService from '../../services/email.service.js';
import { getUserLanguage } from '../../utils/getLanguageById.js';
import { config } from '../../../config/index.js';

export const reminderCron = () => {
    // Every day at 09:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log("Running Reminder Cron...");

        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: "ACTIVE"
            },
            include: {
                customer: true,
                plan: true
            }
        });

        for (const sub of subscriptions) {
            const diff = dayjs(sub.endsAt).startOf('day').diff(dayjs().startOf('day'), 'day');

            const lang = await getUserLanguage(sub.customer?.languageId) || 'fr';

            const endDate = dayjs(sub.endsAt).format(config("constants.date_format.readable_date"));

            console.log("diff", diff);
            

            // 7 Days Reminder
            if (diff === 7 ) {
                await EmailService.sendSubscriptionReminder({user: sub.customer, plan: sub.plan, endDate: endDate, daysLeft: 7}, lang);
            }

            // 1 Day Reminder
            if (diff === 1) {
                await EmailService.sendSubscriptionReminder({user: sub.customer, plan: sub.plan, endDate: endDate, daysLeft: 1}, lang);
            }
        }
    });
};