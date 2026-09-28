import prisma from '../../../config/db.config.js';
import { Webhook } from 'fedapay';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { config } from "../../../config/index.js";
import dayjs from 'dayjs';
import emailService from '../../../common/services/email.service.js';

class WebhookService {

    async handleWebhook(payload, signature) {
        let event;
        
        try {
            event = Webhook.constructEvent(payload, signature, process.env.FEDAPAY_WEBHOOK_SECRET);
        } catch (err) {
            console.log('Invalid Webhook Signature');
            throw new Error('Invalid Webhook Signature');
        }

        // Only handle relevant events
        if (!["transaction.approved", "transaction.declined", "transaction.canceled"].includes(event.name)) {
            return;
        }

        console.log('Enter Webhook');

        const transactionData = event.entity;
        const internalTxId = transactionData.custom_metadata?.transactionId;
        const userId = transactionData.custom_metadata?.userId;

        const tx = await prisma.transaction.findFirst({
            where: { id: internalTxId, customerId: userId },
            include: {
                plan: true,
                customer: true,
            }
        });

        
        if (!tx) return;
        
        if (tx.status === "SUCCESS") {
            console.log("Already SUCCESS → ignore webhook");
            return;
        }
        
        switch (event.name) {
            case 'transaction.approved':
                console.log('Success start');
                await WebhookService.handleSuccessfulPayment(transactionData, tx, userId);
                break;

            case 'transaction.declined':
            case 'transaction.canceled':
                console.log('Cancel start');
                // Only update if still pending
                if (tx.status === "PENDING") {
                    await WebhookService.handleFailedPayment(tx, event.name);
                }
                break;

            default:
                console.log(`Unhandled event type: ${event.name}`);
        }
    }

    static async handleSuccessfulPayment(data, tx, userId) {
        // Find active subscription
        const activeSub = await prisma.subscription.findFirst({
            where: {
                customerId: userId,
                status: "ACTIVE"
            },
            include: {
                plan: true
            }
        });

        const plan = tx.plan;
        const customer = tx.customer;

        // Expire existing subscription
        if (activeSub) {
            await prisma.subscription.update({
                where: { id: activeSub.id },
                data: {
                    status: "EXPIRED",
                    endsAt: new Date()
                }
            });

            // add subscription conversation table
            if(activeSub.plan.code == "FREE" && plan.code == "PREMIUM"){
                await prisma.subscriptionConversion.create({
                    data: {
                        customerId: userId,
                        fromPlan: "FREE",
                        toPlan: "PREMIUM",
                        fromPlanId: activeSub.plan.id,
                        toPlanId: plan.id,
                        conversionDate: new Date(),
                        source: "PAYMENT"
                    }
                });
            }
        }        

        const now = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        // Create New Subscription
        const newSubscription = await prisma.subscription.create({
            data: {
                customerId: userId,
                planId: tx.planId,
                startsAt: now,
                endsAt: endDate,
                status: "ACTIVE",
                source: "PAYMENT",
                isAutoRenew: true,
                planData: plan,
                userData: customer
            }
        });

        // Update Transaction
        await prisma.transaction.update({
            where: { id: tx.id },
            data: {
                subscriptionId: newSubscription.id,
                paymentMethod: data.payment_method.brand || null,
                status: "SUCCESS",
                paidAt: new Date(),
                rawResponse: JSON.parse(JSON.stringify(data))
            }
        });

        // Payment Success: Send Mail to user
        const lang = await getUserLanguage(customer?.languageId) || 'en';
                
        const planData = {
            name        : `Premium ( ${plan.name} )`,
            amount      : `${plan.price} ${config("constants.currency_symbol")}`,
            start_date  : dayjs(newSubscription.startsAt).format(config("constants.date_format.readable_date")),
            end_date    : dayjs(newSubscription.endsAt).format(config("constants.date_format.readable_date"))
        };
        await emailService.sendMailOnSubscriptionPurchase(planData, customer, 'user', lang);

        console.log('Success completed');
    }

    static async handleFailedPayment(tx, type) {
        if (!internalTxId) return;

        if (tx?.status === "SUCCESS") return;

        await prisma.transaction.update({
            where: { id: tx.id },
            data: { status: 'FAILED' }
        });

        // Payment Failed: Send Mail to user

        console.log('Cancel End');
    }
}

export default new WebhookService();