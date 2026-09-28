import HttpError from '../../../common/errors/http.error.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import notificationService from './notification.service.js';

class NotificationController {
  
  async index (req, res, next) {
    try {
      const customer = req.user;
      const { page, type } = req.query;    

      const result = await notificationService.index(customer, type, Number(page) || 1);

      res.json(
        successResponse(
          "success",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async readNotification (req, res, next) {
    try {
      const id = req.params.id;

      const result = await notificationService.readNotification(id);

      res.json(
        successResponse(
          "success",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async markNotificationReadAll (req, res, next) {
    try {
      const result = await notificationService.markNotificationReadAll();

      res.json(
        successResponse(
          "success",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();