import HttpError from '../../../common/errors/http.error.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import staticPageService from './static-page.service.js';

class StaticPageController {
  async getAllSettings(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const data = await staticPageService.getAllSettings(lang);
      res.json(successResponse(t(lang, 'static', 'USER_SETTINGS_FETCHED'), data));
    } catch (e) {
      next(e);
    }
  }


  async getSupportEmail(req, res, next) {
    try {
      const lang = req.lang || 'en';

      const data = await staticPageService.getSupportSettings();

      res.json(successResponse(
        t(lang, 'common', 'SUPPORT_FETCHED'),
        data
      ));
    } catch (error) {
      next(error);
    }
  }

  delete = async (req, res, next) => {
    try {
      const result = await staticPageService.delete(req.user);
      
      res.status(200).json( successResponse(t(req.lang, 'user', 'USER_DELETED')));
    } catch (error) {
      next(error);
    }
  };

  set = async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'customer not found', 'common');
      }

      const { status, email } = req.body;

      const lang = req.lang || 'en';

      const data = await staticPageService.setStatus(req.user, status, email);

      res.json(
        successResponse(t(lang, 'common', 'BECOME_PODCASTER_SAVED'), data )
      );
    } catch (e) {
      next(e);
    }
  };
}

export default new StaticPageController();