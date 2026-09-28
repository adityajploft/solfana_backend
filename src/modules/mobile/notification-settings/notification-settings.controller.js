import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import notificationSettingsService from './notification-settings.service.js';

class NotificationSettingsController {
  async getSettings(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const settings = await notificationSettingsService.getNotificationSettings(req.user.id);
      res.json(successResponse(
        t(lang, 'notification', 'SETTINGS_FETCHED'),
        {
          notifications: settings.notifications,
          lastUpdated: settings.lastUpdated
        }
      ));
    } catch (e) {
      next(e);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const settings = await notificationSettingsService.updateNotificationSettings(
        req.user.id, 
        req.body,
        lang
      );
      res.json(successResponse(t(lang, 'notification', 'SETTINGS_UPDATED'), settings));
    } catch (e) {
      next(e);
    }
  }

}

export default new NotificationSettingsController();