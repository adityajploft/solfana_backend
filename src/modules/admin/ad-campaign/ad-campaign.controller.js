import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import AdCampaignService from './ad-campaign.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import HttpError from '../../../common/errors/http.error.js';
import { createSchema, updateCampaignStatusSchema, updateSchema } from './ad-campaign.validator.js';
import { id } from 'zod/v4/locales';

class AdCampaignController {


  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || 'fr';

      // validate body
      const parsedBody = await createSchema(lang).parseAsync(req.body);

      const result = await AdCampaignService.create({ body: parsedBody });

      return res.status(201).json(
        successResponse(t(lang, 'ad-campaign', 'ADCAMPAIGN_CREATED'), result )
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

      const result = await AdCampaignService.index(lang, { page, limit, search });

      res.json(
        successResponse(
          t(lang, 'ad-campaign', 'ADCAMPAIGN_LIST'),
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

      const result = await AdCampaignService.show(req.params.id, lang);

      res.json(
        successResponse(
          t(lang, 'ad-campaign', 'ADCAMPAIGN_DETAIL'),
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
      const parsedBody = await updateSchema(req.params.id, lang).parseAsync(req.body);      

      const result = await AdCampaignService.update({id: req.params.id, body: parsedBody });

      res.json(successResponse(t(lang, 'ad-campaign', 'ADCAMPAIGN_UPDATED'), result));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      await AdCampaignService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'ad-campaign', 'ADCAMPAIGN_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  changeStatus = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'fr';

      // validate body
      const validatedData = await updateCampaignStatusSchema(lang).parseAsync(req.body);

      await AdCampaignService.changeStatus(req.params.id, validatedData.status);

      res.json(
        successResponse(
          t(lang, 'ad-campaign', 'ADCAMPAIGN_STATUS_CHANGE')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new AdCampaignController();