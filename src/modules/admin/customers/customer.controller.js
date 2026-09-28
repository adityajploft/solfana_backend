import customerService from './customer.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';

class CustomerController {

    index = async (req, res, next) => {
        try {
            const { page, limit, search } = req.query;

            const result = await customerService.index({
                page: Number(page) || 1,
                limit: Number(limit) || 10,
                search,
            });

            res.json(
                successResponse(
                    t(req.lang, 'customer', 'CUSTOMER_LIST'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    show = async (req, res, next) => {
        try {
            const result = await customerService.show(req.params.id, req.lang);

            res.json(
                successResponse(
                    t(req.lang, 'customer', 'CUSTOMER_DETAILS'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
          const result = await customerService.delete(req.params.id);
          res.status(200).json(
            successResponse(
                t(req.lang, 'user', 'USER_DELETED')
            )
          );
        } catch (error) {
          next(error);
        }
    };


    toggleStatus = async (req, res, next) => {
        try {
            const updatedCustomer = await customerService.toggleStatus(req.params.id);

            res.json(
                successResponse(
                    t(req.lang, 'customer', 'CUSTOMER_STATUS_UPDATED'),
                    updatedCustomer
                )
            );
        } catch (error) {
            next(error);
        }
    };
}

export default new CustomerController();