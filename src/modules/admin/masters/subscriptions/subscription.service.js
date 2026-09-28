import prisma from '../../../../config/db.config.js';
import HttpError from '../../../../common/errors/http.error.js';
import { SubscriptionStatus, SubscriptionCode } from '@prisma/client';
import {createNotification} from "../../../../common/services/notifications/notificationService.js";
import { addFreeSubscriptionPlan } from '../../../../common/utils/helper.js';




class SubscriptionService {

  async create(data) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          {
            name: data.name
          },
          {
            code: data.code
          }
        ]
      }
    });

    if (existingPlan) {
      throw new HttpError(409, 'SUBSCRIPTION_PLAN_ALREADY_EXISTS', 'subscription_plan_already_exists', 'subscription');
    }

    if (data.code === 'FREE' && Number(data.price) > 0) {
      throw new HttpError(400, 'FREE_PLAN_PRICE_MUST_BE_ZERO', 'free_plan_price_must_be_zero', 'subscription');
    }

    if (data.code === 'PREMIUM' && !data.durationDays) {
      throw new HttpError(400, 'DURATION_REQUIRED_FOR_PREMIUM', 'duration_required_for_premium', 'subscription');
    }

    return await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        price: data.price,
        currency: data.currency,
        durationDays: data.durationDays,
        features: data.features,
        isActive: data.isActive ?? true
      }
    });
  }

  async list({ page = 1, limit = 10, search = '', fetchType="list" }) {
    const skip = (page - 1) * limit;

    const whereCondition = {
      deletedAt: null,
    };

    if (fetchType === 'dropdown') {
      whereCondition.code = 'PREMIUM';
    } else {
      whereCondition.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      if (search && ['FREE', 'PREMIUM'].includes(search.toUpperCase())) {
        whereCondition.OR.push({
          code: search.toUpperCase(),
        });
      }
    }

    console.log('whereCondition:', whereCondition);

    const plans = await prisma.subscriptionPlan.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    const totalCount = await prisma.subscriptionPlan.count({
      where: whereCondition,
    });

    const records = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      durationDays: plan.durationDays,
      features: plan.features,
      isActive: plan.isActive,
      createdAt: plan.createdAt
    }));

    return {
      records,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }



  async getById(id) {
    return await prisma.subscriptionPlan.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });
  }

  async update(id, data) {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });

    if (!existingPlan) {
      throw new HttpError(
        404,
        'SUBSCRIPTION_PLAN_NOT_FOUND',
        'subscription_plan_not_found',
        'subscription'
      );
    }

    const planCode = existingPlan.code || 'PREMIUM';

    if (planCode === 'FREE' && Number(data.price) > 0) {
      throw new HttpError(
        400,
        'FREE_PLAN_PRICE_MUST_BE_ZERO',
        'free_plan_price_must_be_zero',
        'subscription'
      );
    }

    if (planCode === 'PREMIUM' && !data.durationDays && data.durationDays !== 0) {
      throw new HttpError(
        400,
        'DURATION_REQUIRED_FOR_PREMIUM',
        'duration_required_for_premium',
        'subscription'
      );
    }

    return await prisma.subscriptionPlan.update({
      where: { id },
      data
    });
  }


  async delete(id) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });
    if (!existingPlan) throw new HttpError(404, 'SUBSCRIPTION_PLAN_NOT_FOUND', 'subscription_plan_not_found', 'subscription');

    return await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }

  async toggleStatus(id) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!existingPlan) {
      throw new HttpError(
        404,
        'SUBSCRIPTION_PLAN_NOT_FOUND',
        'subscription_plan_not_found',
        'subscription'
      );
    }

    return await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        isActive: !existingPlan.isActive
      }
    });
  }



  async assignSubscription(data, adminId) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      include: {
        language: true,
      },
    });

    if (!customer) {
      throw new HttpError(
        404,
        'CUSTOMER_NOT_FOUND',
        'customer_not_found',
        'subscription'
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId }
    });

    if (!plan) {
      throw new HttpError(
        404,
        'PLAN_NOT_FOUND',
        'plan_not_found',
        'subscription'
      );
    }

    if (plan.code === 'FREE') {
      throw new HttpError(
        400,
        'FREE_PLAN_CANNOT_BE_ASSIGNED_MANUALLY',
        'free_plan_cannot_be_assigned_manually',
        'subscription'
      );
    }

    const userSnapshot = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      isActive: customer.isActive,
      phone: customer.phone,
      profileImage: customer.profileImage
    };

    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        customerId: data.customerId,
        status: 'ACTIVE'
      },                  
      include: {
          plan: true
      }
    });

    // Expire old active subscription
    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'EXPIRED',
          endsAt: new Date()
        }
      });

      // add subscription conversation table
      if(existingSubscription.plan.code == "FREE" && plan.code == "PREMIUM"){
        await prisma.subscriptionConversion.create({
          data: {
            customerId: data.customerId,
            fromPlan: "FREE",
            toPlan: "PREMIUM",
            fromPlanId: existingSubscription.plan.id,
            toPlanId: plan.id,
            conversionDate: new Date(),
            source: "MANUAL"
          }
        });
      }
    }

    // Create new subscription
    const startsAt = new Date();

    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + plan.durationDays);

    

    const newSubscription = await prisma.subscription.create({
      data: {
        customerId: data.customerId,
        planId: data.planId,
        startsAt,
        endsAt,
        status: 'ACTIVE',
        source: data.source,
        assignedByAdminId: adminId,
        isAutoRenew: false,
        planData: plan,
        userData: userSnapshot,
        note: data.note
      }
    });

    // SEND NOTIFICATION
    await createNotification({
      receiverId: data.customerId,
      receiverType: 'CUSTOMER',
      senderId: adminId,
      senderType: 'USER',

      notificationKey: 'subscription_status',

      moduleType: 'subscription',
      moduleId: newSubscription.id,

      isClickable: true,
      clickAction: 'OPEN_SCREEN',
      clickValue: "subscription_list",

      lang: customer.language?.lang || 'fr',

      data: {
        planName: plan.name,
        durationDays: plan.durationDays,
        endsAt: endsAt.toISOString()
      },

      // IMPORTANT: you must fetch token from device table
      fcmToken: customer.fcmToken || null
    });
  }


  async revokeSubscription(customerId, note) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new HttpError(
        404,
        'CUSTOMER_NOT_FOUND',
        'customer_not_found',
        'subscription'
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        customerId,
        status: 'ACTIVE'
      }
    });

    if (!subscription) {
      throw new HttpError(
        404,
        'ACTIVE_SUBSCRIPTION_NOT_FOUND',
        'active_subscription_not_found',
        'subscription'
      );
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        endsAt: new Date(),
        ...(note && { note })
      }
    });

    await addFreeSubscriptionPlan(customer);
  }




  async getUserSubscription(customerId, { page = 1, limit = 10, search = '' }) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'customer_not_found', 'subscription');
    }
    const skip = (page - 1) * limit;

    const whereCondition = {
      customerId,
      status: 'ACTIVE',
      plan: {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      }
    };

    const subscriptions = await prisma.subscription.findMany({
      where: whereCondition,
      include: {
        plan: true,
        transactions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    const totalCount = await prisma.subscription.count({
      where: whereCondition
    });

    const records = subscriptions.map((subscription) => ({
      id: subscription.id,

      customerId: subscription.customerId,
      planId: subscription.planId,

      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,

      status: subscription.status,
      source: subscription.source,
      note: subscription.note,

      isAutoRenew: subscription.isAutoRenew,

      planData: subscription.planData,
      userData: subscription.userData,

      createdAt: subscription.createdAt,

      plan: subscription.plan
        ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          code: subscription.plan.code,
          price: subscription.plan.price,
          currency: subscription.plan.currency,
          durationDays: subscription.plan.durationDays,
          features: subscription.plan.features
        }
        : null,

      transactions: subscription.transactions.map((txn) => ({
        id: txn.id,
        transactionId: txn.transactionId,
        paymentGateway: txn.paymentGateway,
        amount: txn.amount,
        currency: txn.currency,
        status: txn.status,
        paidAt: txn.paidAt
      }))
    }));

    return {
      records,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }




  async getSubscriptionHistory({ customerId, status, page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const upperSearch = search.toUpperCase();

    const where = {
      ...(customerId && { customerId }),

      ...(status &&
        Object.values(SubscriptionStatus).includes(status.toUpperCase()) && {
        status: status.toUpperCase()
      }),

      ...(search && {
        OR: [
          {
            customer: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },

          {
            customer: {
              email: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },

          {
            plan: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },

          ...(Object.values(SubscriptionCode).includes(upperSearch)
            ? [
              {
                plan: {
                  code: upperSearch
                }
              }
            ]
            : [])
        ]
      })
    };

    const total = await prisma.subscription.count({ where });

    const subscriptions = await prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
            features: true
          }
        }
      }
    });

    const records = subscriptions.map(item => ({
      id: item.id,
      status: item.status,
      source: item.source,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      note: item.note,
      createdAt: item.createdAt,
      customer: item.customer,
      plan: item.plan
      ? {
          id: item.plan.id,
          name: item.plan.name,
          price: item.plan.price,
          durationDays: item.plan.durationDays,
          features: item.plan.features
        }
      : null
    }));

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



}

export default new SubscriptionService();