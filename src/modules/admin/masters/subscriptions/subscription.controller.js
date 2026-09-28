import { t } from '../../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../../common/utils/apiResponse.js';
import subscriptionService from './subscription.service.js';
import { getUserLanguage } from '../../../../common/utils/getLanguageById.js';
import HttpError from '../../../../common/errors/http.error.js';

class SubscriptionController {

  async create(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      const result = await subscriptionService.create(req.body);

      res.status(201).json(
        successResponse(
          t(lang, 'subscription', 'SUBSCRIPTION_PLAN_CREATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const fetchType = req.query.fetchType || '';

      const result = await subscriptionService.list({
        page,
        limit,
        search,
        fetchType
      });

      res.json(
        successResponse(
          t(lang, 'subscription', 'SUBSCRIPTION_PLAN_LIST'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async getById(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      const result = await subscriptionService.getById(req.params.id);
      if (!result) throw new HttpError(404, 'SUBSCRIPTION_PLAN_NOT_FOUND', 'subscription_plan_not_found', 'subscription');
      res.json(successResponse(
        t(lang, 'subscription', 'SUBSCRIPTION_PLAN_DETAILS'),
        result
      )
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      const result = await subscriptionService.update(req.params.id, req.body);

      res.json(successResponse(
        t(lang, 'subscription', 'SUBSCRIPTION_PLAN_UPDATED'),
        result
      )
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      await subscriptionService.delete(req.params.id);

      res.json(successResponse(
        t(lang, 'subscription', 'SUBSCRIPTION_PLAN_DELETED')
      )
      );
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const result = await subscriptionService.toggleStatus(req.params.id);

      res.json(
        successResponse(
          t(lang, 'subscription', 'SUBSCRIPTION_PLAN_STATUS_UPDATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }



  async assignSubscription(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      await subscriptionService.assignSubscription(
        req.body,
        req.user.id
      );

      res.status(201).json(
        successResponse(t(lang, 'subscription', 'SUBSCRIPTION_PLAN_ASSIGNED'))
      );
    } catch (error) {
      next(error);
    }
  }

  async revokeSubscription(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      await subscriptionService.revokeSubscription(
        req.body.customerId,
        req.body.note
      );

      res.json(
        successResponse(
          t(lang, 'subscription', 'SUBSCRIPTION_REVOKED')
        )
      );
    } catch (error) {
      next(error);
    }
  }



  async getUserSubscription(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await subscriptionService.getUserSubscription(
        req.params.userId,
        { page, limit, search }
      );

      res.json(
        successResponse(
          t(lang, 'subscription', 'SUBSCRIPTION_PLAN_DETAILS'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptionHistory(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const customerId = req.query.customerId || null;
      const status = req.query.status || null;

      const result = await subscriptionService.getSubscriptionHistory({
        customerId,
        status,
        page,
        limit,
        search
      });

      res.json(
        successResponse(
          t(lang, 'subscription', 'SUBSCRIPTION_HISTORY_FETCHED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }



}

export default new SubscriptionController();