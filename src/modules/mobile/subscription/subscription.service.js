import { error } from 'node:console';
import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';


class SubscriptionService {

    async customerPlanList(customerId) {

        const plans = await prisma.subscriptionPlan.findMany({
            where: {
                deletedAt: null,
                isActive: true
            },
            orderBy: {
                durationDays: 'asc'
            },
            select: {
                id: true,
                name: true,
                code: true,
                description: true,
                price: true,
                currency: true,
                durationDays: true,
                features: true,
                createdAt: true
            }
        });

        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                customerId,
                status: 'ACTIVE',
                OR: [
                    { endsAt: null },
                    { endsAt: { gt: new Date() } }
                ]
            },
            select: {
                planId: true,
                startsAt: true,
                endsAt: true,
                status: true,
                isAutoRenew: true
            }
        });

        const result = {
            freePlan: [],
            premiumPlans: []
        };

        for (const plan of plans) {

            const updatedPlan = {
                ...plan,
                isActive: activeSubscription?.planId === plan.id
            };

            if (plan.code === "FREE") {
                result.freePlan.push(updatedPlan);
            } else if (plan.code === "PREMIUM") {
                result.premiumPlans.push(updatedPlan);
            }
        }

        return {
            ...result,
            activeSubscription: activeSubscription
                ? {
                    planId: activeSubscription.planId,
                    startDate: activeSubscription.startsAt,
                    endDate: activeSubscription.endsAt,
                    status: activeSubscription.status,
                    isAutoRenew: activeSubscription.isAutoRenew
                }
                : null
        };
    }

    async mySubscriptionHistory(customerId, { page = 1, limit = 10 }) {
        const skip = (page - 1) * limit;

        const where = {
            customerId
        };

        const subscriptions = await prisma.subscription.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                transactions: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        const total = await prisma.subscription.count({ where });

        const records = subscriptions.map(item => {
            const transaction = item.transactions?.[0];
            const raw = transaction?.rawResponse || {};

            const paymentMethodRaw =
                raw?.payment_method || raw?.paymentMethod || null;

            return {
                id: item.id,
                customerId: item.customerId,
                planId: item.planId,

                startsAt: item.startsAt,
                endsAt: item.endsAt,

                status: item.status,
                source: item.source,
                note: item.note,

                isAutoRenew: item.isAutoRenew,

                createdAt: item.createdAt,

                planData: {
                    id: item.planData?.id,
                    name: item.planData?.name,
                    code: item.planData?.code,
                    price: item.planData?.price,
                    currency: item.planData?.currency,
                    durationDays: item.planData?.durationDays,
                    features: item.planData?.features
                },

                payment: transaction
                    ? {
                        paymentGateway: transaction.paymentGateway,
                        paymentMethodType: transaction.paymentMethod,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        status: transaction.status,
                        paidAt: transaction.paidAt,

                        paymentMethod: paymentMethodRaw
                            ? {
                                id: paymentMethodRaw.id,
                                brand: paymentMethodRaw.brand,
                                method: paymentMethodRaw.method,
                                number: paymentMethodRaw.number,
                                country: paymentMethodRaw.country
                            }
                            : null
                    }
                    : null
            };
        });

        return {
            records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async cancelSubscription(subscriptionId) {
        const subscription = await prisma.subscription.findFirst({ where : {id: subscriptionId}});

        if(!subscription){
            throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'subscription_not_found', 'subscription');
        }

        if (subscription.status !== "ACTIVE") {
            throw new HttpError(400, 'INVALID_SUBSCRIPTION_STATE', 'subscription_not_active', 'subscription');
        }

        if (!subscription.isAutoRenew) { return true; }

        await prisma.subscription.update({
            where : { id: subscriptionId },
            data: { isAutoRenew: false }
        });        

        return true;
    }
}

export default new SubscriptionService();