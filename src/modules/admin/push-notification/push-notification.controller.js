import path from "path";
import { t } from "../../../common/services/i18n/i18n.service.js";
import { successResponse } from "../../../common/utils/apiResponse.js";
import PushNotificationService from "./push-notification.service.js";
import { getUserLanguage } from "../../../common/utils/getLanguageById.js";

import { createPushNotificationDraftSchema, createAndSendPushNotificationSchema, updatePushNotificationSchema } from "./push-notification.validator.js";

class PushNotificationController {
  
  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const sendImmediately = req.body.send_immediately === true || req.body.send_immediately === "true";

      // Validate body
      const parsedBody = sendImmediately ? await createAndSendPushNotificationSchema.parseAsync(req.body) : await createPushNotificationDraftSchema.parseAsync(req.body);

      const result = await PushNotificationService.create({body: parsedBody, sendImmediately, senderId: req.user.id });

      return res.status(201).json(
        successResponse(t(lang, "notification", sendImmediately ? "NOTIFICATION_CREATED_AND_SENT" : "NOTIFICATION_DRAFT_CREATED"), result)
      );
    } catch (error) {
      next(error);
    }
  };

  send = async (req, res, next) => {
    try {
      const result = await PushNotificationService.send(req.params.id);

      return res.status(200).json(successResponse("Success", result) );
    } catch (error) {
      next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await PushNotificationService.list({ page, limit, search });

      return res.status(200).json(successResponse("Success", result ) );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const result = await PushNotificationService.getById(req.params.id);

      return res.status(200).json(
        successResponse(
          t(lang, "email", "EMAIL_FETCHED"),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const parsedBody = await updatePushNotificationSchema.parseAsync(req.body);

      const sendImmediately = req.body.send_immediately === true || req.body.send_immediately === "true";

      const result = await PushNotificationService.update({id: req.params.id, body: parsedBody, sendImmediately});

      return res.status(200).json(successResponse(t(lang, "notification', 'PUSH_NOTIFICATION_UPDATE_SUCCESS"),result));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      await PushNotificationService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'notification', 'PUSH_NOTIFICATION_DELETE_SUCCESS')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new PushNotificationController();