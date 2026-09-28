import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import subscriptionService from './subscription.service.js';

class SubscriptionController {

    async customerPlanList(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
            const customerId = req.user?.id;
            const result = await subscriptionService.customerPlanList(customerId);

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

    async mySubscriptionHistory(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await subscriptionService.mySubscriptionHistory(
                req.user.id,
                { page, limit }
            );

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

    async cancelSubscription(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

            const subscriptionId = req.params.subscriptionId;

            const result = await subscriptionService.cancelSubscription(subscriptionId);

            res.json(
                successResponse(t(lang, 'subscription', 'SUBSCRIPTION_CANCELED_SUCCESS'), result)
            );
        } catch (error) {
            next(error);
        }
    }

}

export default new SubscriptionController();