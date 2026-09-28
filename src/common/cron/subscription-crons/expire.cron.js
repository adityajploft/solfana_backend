import cron from 'node-cron';
import prisma from '../../../config/db.config.js';
import dayjs from 'dayjs';
import EmailService from '../../services/email.service.js';
import { getUserLanguage } from '../../utils/getLanguageById.js';
import { config } from '../../../config/index.js';
import { addFreeSubscriptionPlan } from '../../utils/helper.js';

export const expireCron = () => {
    // 1:10 AM (night, once per day)
    cron.schedule('10 1 * * *', async () => {
        console.log("Running Expiry Cron...");

        const yesterday = dayjs().subtract(1, 'day').endOf('day');

        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: "ACTIVE",
                endsAt: {
                    lte: yesterday.toDate()
                }
            },
            include: {
                customer: true,
                plan: true
            }
        });

        for (const sub of subscriptions) {
            try {
                const lang = await getUserLanguage(sub.customer?.languageId) || 'fr';

                const endDate = dayjs(sub.endsAt).format(config("constants.date_format.readable_date"));

                // Expire subscription
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        status: "EXPIRED"
                    }
                });

                if(sub.customer){
                    // Add Free Plan
                    await addFreeSubscriptionPlan(sub.customer);

                    // Send email                
                    await EmailService.sendExpiredEmail({user: sub.customer, plan: sub.plan, endDate}, lang);
                }


            } catch (err) {
                console.error("Expire Cron Error:", err.message);
            }
        }
    });
};