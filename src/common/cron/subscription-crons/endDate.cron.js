import cron from 'node-cron';
import prisma from '../../../config/db.config.js';
import dayjs from 'dayjs';
import EmailService from '../../services/email.service.js';
import PaymentService from '../../../modules/mobile/payment/payment.service.js';
import { getUserLanguage } from '../../utils/getLanguageById.js';

export const endDateCron = () => {
    // 1:00 AM (night, once per day)
    cron.schedule('0 1 * * *', async () => {
        console.log("Running End Date Cron...");

        const startOfDay = dayjs().startOf("day").toDate();
        const endOfDay = dayjs().endOf("day").toDate();

        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: "ACTIVE",
                endsAt: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                isAutoRenew: true
            },
            include: {
                customer: true,
                plan: true
            }
        });

        for (const sub of subscriptions) {
            try {
                const lang = await getUserLanguage(sub.customer?.languageId) || 'fr';

                // Create new payment link
                const payment = await PaymentService.initiatePayment(sub.customer, {planId: sub.planId});

                await EmailService.sendPaymentLink({user: sub.customer, plan: sub.plan, paymentUrl: payment.paymentUrl}, lang);

            } catch (err) {
                console.error("EndDate Cron Error:", err.message);
            }
        }
    });
};