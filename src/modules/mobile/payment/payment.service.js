import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { FedaPay, Transaction } from 'fedapay';
import emailService from '../../../common/services/email.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { config } from "../../../config/index.js";
import dayjs from 'dayjs';

const paymentEnv = process.env.FEDAPAY_ENVIRONMENT || "sandbox";

FedaPay.setApiKey(process.env.FEDAPAY_SECRET);
FedaPay.setEnvironment(paymentEnv);

class PaymentService {

    // INITIATE PAYMENT
    async initiatePayment(user, body) {
        const { planId } = body;
        const userId = user.id;

        // Check existing active subscription
        const existingSub = await prisma.subscription.findFirst({
            where: {
                customerId: userId,
                planId: planId,
                status: "ACTIVE",
                endsAt: {
                    gt: new Date()
                }
            }
        });

        if (existingSub) {
            throw new HttpError(400, 'ALREADY_SUBSCRIBED_PLAN', 'already_subscribed_plan', 'payment');
        }

        // 1. Fetch plan
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) { throw new HttpError(404, 'PLAN_NOT_FOUND', 'plan_not_found', 'payment'); }

        // 2. Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                customerId: userId,
                planId: plan.id,
                paymentGateway: "FEDAPAY",
                transactionId: "TEMP_" + Date.now(),
                amount: plan.price,
                currency: plan.currency,
                status: "PENDING"
            }
        });

        // 3. Check Fedapay Customer
        let customerData;
        if (user.fedapayCustomerId) {
            customerData = { id: user.fedapayCustomerId };
        } else {
            const nameParts = (user.name || "Guest User").trim().split(" ");
            const firstname = nameParts[0];
            const lastname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Customer";
            customerData = {
                firstname: firstname,
                lastname: lastname,
                email: user.email,
                phone_number: {
                    number: user.phone, 
                    country: "BJ"
                }
            };
        }

        // 4. Create FedaPay Transaction
        try {
            const fedapayTx = await Transaction.create({
                description: "Subscription Payment",
                amount: Math.round(Number(plan.price)),
                currency: { iso: plan.currency },
                callback_url: `${process.env.FRONTEND_URL}/payment/callback?tx=${transaction.id}&customerId=${userId}`,
                customer: customerData,
                metadata: {
                    transactionId: transaction.id,
                    userId
                },
                custom_metadata: {
                    transactionId: transaction.id,
                    userId: userId
                }
            });

            const token = await fedapayTx.generateToken();

            if (!user.fedapayCustomerId && fedapayTx.customer_id) {
                await prisma.customer.update({
                    where: { id: userId },
                    data: { fedapayCustomerId: String(fedapayTx.customer_id) }
                });
            }

            // 5. Save real transaction ID
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    transactionId: String(fedapayTx.id)
                }
            });

            return {
                paymentUrl: token.url,
                transactionId: transaction.id
            };
        } catch (err) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: "FAILED" }
            });
            throw err;
        }
    }

    async verifyPayment(userId, transactionId) {
        // 1. Get transaction
        const tx = await prisma.transaction.findFirst({
            where: { id: transactionId, customerId: userId },
            include: {
                plan: true,
                customer: true,
            }
        });

        if (!tx) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'transaction_not_found', 'payment');

        if (tx.customerId !== userId) {
            throw new HttpError(404, 'UNAUTHORIZED', 'unauthorized', 'auth');
        }

        if (tx.status === "SUCCESS") {
            return {
                status: "SUCCESS",
                source: "webhook",
                transactionId: tx.id
            };
        }

        if (tx.status === "FAILED") {
            return {
                status: "FAILED",
                source: "webhook",
                transactionId: tx.id
            };
        }

        // 2. Fetch from FedaPay
        const fedapayTx = await Transaction.retrieve(tx.transactionId);

        let status = "PENDING";
        if (fedapayTx.status === "approved") {
            status = "SUCCESS";
        } else if (fedapayTx.status === "declined") {
            status = "FAILED";
        }

        // 3. Sync DB if success
        if (status === "SUCCESS" && tx.status === "PENDING") {
            await PaymentService.handleSuccess(userId, tx, fedapayTx);
        }

        // 4. Sync DB if failed
        if (status === "FAILED" && tx.status === "PENDING") {
            await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "FAILED" }
            });

            // Payment Failed: Send Mail to user            
            await PaymentService.sendFailedPaymentMail(tx.plan, tx.customer);    
        }

        if (status === "PENDING" && tx.status === "PENDING") {
            await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "FAILED" }
            }); 
        }

        return {
            status,
            transactionId: tx.id
        };
    }

    static async handleSuccess(userId, tx, fedapayTx) {     
        if (tx.subscriptionId) return;

        if (tx.status === "SUCCESS") {
            console.log("Already processed");
            return;
        }
        // 1. Find active subscription
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

        // 2. Expire existing subscription
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
                status: "SUCCESS",
                paidAt: new Date(),
                rawResponse: JSON.parse(JSON.stringify(fedapayTx || {}))
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
    }

    static async sendFailedPaymentMail(plan, customer){
        const lang = await getUserLanguage(customer?.languageId) || 'en';
        
        const planData = {
            name        : `Premium ( ${plan.name} )`,
            amount      : `${plan.price} ${config("constants.currency_symbol")}`,
            attempt_date : dayjs().format(config("constants.date_format.readable_date_time"))
        };
        await emailService.sendMailOnSubscriptionPaymentFailed(planData, customer, 'user', lang);
    }
}

export default new PaymentService();