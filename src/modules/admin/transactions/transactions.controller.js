import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import HttpError from '../../../common/errors/http.error.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import transactionService from './transactions.service.js';

class TrackController {

    async list(req, res, next) {
    try {
      const user = req.user;

      if (user.roleId !== 1) {
        throw new HttpError(403, 'ADMIN_ONLY', 'admin_only', 'auth');
      }

      const lang = await getUserLanguage(user?.languageId) || req.lang || 'en';

      const result = await transactionService.getTransactions(req.query);

      res.json(
        successResponse(
          t(lang, 'transaction', 'TRANSACTION_LIST_FETCHED'),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }

  async detail(req, res, next) {
    try {
      const user = req.user;

      if (user.roleId !== 1) {
        throw new HttpError(403, 'ADMIN_ONLY', 'admin_only', 'auth');
      }

      const lang = await getUserLanguage(user?.languageId) || req.lang || 'en';

      const { id } = req.params;

      const data = await transactionService.getTransactionById(id);

      if (!data) {
        throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'transaction_not_found', 'transaction');
      }

      res.json(
        successResponse(
          t(lang, 'transaction', 'TRANSACTION_DETAIL_FETCHED'),
          data
        )
      );

    } catch (error) {
      next(error);
    }
  }
}

export default new TrackController();