import path from "path";
import { t } from "../../../common/services/i18n/i18n.service.js";
import { successResponse } from "../../../common/utils/apiResponse.js";
import NotificationCampaignService from "./notification-campaign.service.js";
import { getUserLanguage } from "../../../common/utils/getLanguageById.js";

import { createCampaignSchema, updateCampaignSchema, updateNotificationCompaignStatusSchema } from "./notification-campaign.validator.js";

class NotificationCampaignController {
  
  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const parsedBody = await createCampaignSchema.parseAsync(req.body);

      const result = await NotificationCampaignService.create(parsedBody);

      return res.status(201).json(
        successResponse(t(lang, "notification-campaign", "NOTIFICATIONCAMPAIGN_CREATED"), result)
      );
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

      const result = await NotificationCampaignService.list({ page, limit, search });

      return res.status(200).json(successResponse("Success", result ) );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const result = await NotificationCampaignService.show(req.params.id);

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

      const parsedBody = await updateCampaignSchema(req.params.id).parseAsync(req.body);

      const result = await NotificationCampaignService.update({id: req.params.id, body: parsedBody});

      return res.status(200).json(successResponse(t(lang, "notification-campaign', 'NOTIFICATIONCAMPAIGN_UPDATED"),result));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      await NotificationCampaignService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'notification-campaign', 'NOTIFICATIONCAMPAIGN_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  changeStatus = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      const parsedBody = await updateNotificationCompaignStatusSchema.parseAsync(req.body);

      await NotificationCampaignService.changeStatus(req.params.id, parsedBody.status);

      res.json(
        successResponse(
          t(lang, 'notification-campaign', 'NOTIFICATIONCAMPAIGN_STATUS_CHANGE')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new NotificationCampaignController();