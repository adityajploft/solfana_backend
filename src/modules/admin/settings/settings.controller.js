import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import HttpError from '../../../common/errors/http.error.js';
import settingsService from './settings.service.js';

const SETTINGS_MESSAGE_KEYS = {
  'about-us': {
    fetched: 'ABOUT_FETCHED',
    updated: 'ABOUT_UPDATED',
  },
  'terms-condition': {
    fetched: 'TERMS_FETCHED',
    updated: 'TERMS_UPDATED',
  },
  'privacy-policy': {
    fetched: 'PRIVACY_FETCHED',
    updated: 'PRIVACY_UPDATED',
  }
};

class SettingsController {

  async getByType(req, res, next) {
    try {
      const { type } = req.query;

      const keys = SETTINGS_MESSAGE_KEYS[type];
      if (!keys) throw new HttpError('INVALID_CONTENT_KEY');

      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const data = await settingsService.getByType(type);

      res.json(successResponse(
        t(lang, 'common', keys.fetched),
        data
      ));
    } catch (e) {
      next(e);
    }
  }

  async updateByType(req, res, next) {
    try {
      const { type } = req.query;

      const keys = SETTINGS_MESSAGE_KEYS[type];
      if (!keys) throw new HttpError('INVALID_CONTENT_KEY');

      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const updated = await settingsService.updateByType(type, req.body);

      res.json(successResponse(
        t(lang, 'common', keys.updated),
        updated
      ));
    } catch (e) {
      next(e);
    }
  }

  async show(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const data = await settingsService.getSupportSettings();

      res.json(successResponse(
        t(lang, 'common', 'SUPPORT_FETCHED'),
        data
      ));
    } catch (error) {
      next(error);
    }
  }


  create = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const data = await settingsService.upsertSupportSettings(req.body);

      res.json(successResponse(
        t(lang, 'common', 'SUPPORT_UPDATED'),
        data
      ));
    } catch (error) {
      next(error);
    }
  };

  async googleAdMob(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const data = await settingsService.getgoogleAdMobSettings();

      res.json(successResponse(
        t(lang, 'common', 'SUPPORT_FETCHED'),
        data
      ));
    } catch (error) {
      next(error);
    }
  }


  createGoogleAdMob = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const data = await settingsService.upsertgoogleAdMobSettings(req.body);

      res.json(successResponse(
        t(lang, 'common', 'SUPPORT_UPDATED'),
        data
      ));
    } catch (error) {
      next(error);
    }
  };

}

export default new SettingsController();
