import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import prisma from '../../../config/db.config.js';
import service from './interests.service.js';

class InterestsController {
  
  async findAll(req, res, next) {
    try {
      const languageRecord = await prisma.language.findUnique({
        where: { id: req.user.languageId },
      });

      const lang = languageRecord?.lang || 'en';
      const { page, limit, search } = req.query;

      const data = await service.findAll({
        lang,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search,
      });

      res.json(
        successResponse(
          t(lang, 'category', 'INTERESTS_FETCHED'), // translated message
          data
        )
      );
    } catch (e) {
      next(e);
    }
  }
}

export default new InterestsController();
