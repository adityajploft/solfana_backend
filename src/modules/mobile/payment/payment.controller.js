import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import PaymentService from './payment.service.js';
import webhookService from './webhook.service.js';

class PaymentController {

    async initiatePayment(req, res, next) {
        try {
            const user = req.user;
            const lang = await getUserLanguage(user?.languageId) || req.lang || 'en';
            
            const result = await PaymentService.initiatePayment(user, req.body);

            res.json(
                successResponse(
                    t(lang, 'payment', 'PAYMENT_INITIATED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async verifyPayment(req, res, next) {
        try {
            const { transactionId, userId } = req.query;
            const result = await PaymentService.verifyPayment(userId, transactionId);

            res.json({
                success: true,
                message: "Payment status fetched",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async webhook(req, res) {
        try {            
            const sigHeader = req.headers['x-fedapay-signature'];
            const body = req.body;

            await webhookService.handleWebhook(body, sigHeader);

            res.sendStatus(200);
        } catch (error) {
            console.error("Webhook Error:", error);
            res.sendStatus(200); // NEVER fail webhook
        }
    }

}

export default new PaymentController();