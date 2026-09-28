import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import BannerService from './banner.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import HttpError from '../../../common/errors/http.error.js';
import { createBannerSchema, updateBannerSchema } from './banner.validator.js';
import { id } from 'zod/v4/locales';

class BannerController {


  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || 'fr';

      // validate body
      const parsedBody = await createBannerSchema(lang).parseAsync(req.body);

      const result = await BannerService.create({ body: parsedBody, bannerImage: req.file });

      return res.status(201).json(
        successResponse(t(lang, 'banner', 'BANNER_CREATED'), result )
      );

    } catch (error) {
      next(error);
    }
  };

  index = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await BannerService.index(lang, { page, limit, search });

      res.json(
        successResponse(
          t(lang, 'banner', 'BANNER_LIST'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const result = await BannerService.show(req.params.id, lang);

      res.json(
        successResponse(
          t(lang, 'banner', 'BANNER_DETAIL'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      // validate body
      const parsedBody = await updateBannerSchema(req.params.id, lang).parseAsync(req.body);      

      const result = await BannerService.update({id: req.params.id, body: parsedBody, bannerImage: req.file });

      res.json(successResponse(t(lang, 'banner', 'BANNER_UPDATED'), result));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      await BannerService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'banner', 'BANNER_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  changeStatus = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const updatedData = await BannerService.changeStatus(req.params.id);

      res.json(
        successResponse(
          t(lang, 'banner', 'BANNER_STATUS_CHANGE'),
          updatedData
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new BannerController();