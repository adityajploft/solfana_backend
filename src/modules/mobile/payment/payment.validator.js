import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';

export const validateInitiatePayment = async (req, res, next) => {
  try {
    const { planId, paymentGateway, paymentMethod } = req.body;

    if (!planId) {
      throw new HttpError(400, 'PLAN_ID_REQUIRED', 'plan_id_required', 'payment');
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(planId)) {
      throw new HttpError(400, 'INVALID_PLAN_ID', 'invalid_plan_id', 'payment');
    }

    const allowedGateways = ['FEDAPAY', 'MTN', 'MOOV', 'WAVE', 'CARD'];

    if (!paymentGateway || !allowedGateways.includes(paymentGateway)) {
      throw new HttpError(400, 'INVALID_PAYMENT_GATEWAY', 'invalid_payment_gateway', 'payment');
    }

    const allowedMethods = ['MTN', 'MOOV', 'WAVE', 'CARD'];

    if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
      throw new HttpError(400, 'INVALID_PAYMENT_METHOD', 'invalid_payment_method', 'payment');
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
        deletedAt: null
      }
    });

    if (!plan) {
      throw new HttpError(404, 'PLAN_NOT_FOUND', 'plan_not_found', 'payment');
    }

    if (plan.code === 'FREE') {
      throw new HttpError(400, 'FREE_PLAN_NOT_PAYABLE', 'free_plan_not_payable', 'payment');
    }

    if (!plan.durationDays) {
      throw new HttpError(400, 'INVALID_PLAN_DURATION', 'invalid_plan_duration', 'payment');
    }

    req.plan = plan;

    next();
  } catch (error) {
    next(error);
  }
};

export const validateTransactionIdParam = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      throw new HttpError(400, 'TRANSACTION_ID_REQUIRED', 'transaction_id_required', 'payment');
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(transactionId)) {
      throw new HttpError(400, 'INVALID_TRANSACTION_ID', 'invalid_transaction_id', 'payment');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'transaction_not_found', 'payment');
    }

    req.transaction = transaction;

    next();
  } catch (error) {
    next(error);
  }
};