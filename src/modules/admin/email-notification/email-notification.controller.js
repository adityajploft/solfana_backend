import path from "path";
import { t } from "../../../common/services/i18n/i18n.service.js";
import { successResponse } from "../../../common/utils/apiResponse.js";
import EmailNotificationService from "./email-notification.service.js";
import { getUserLanguage } from "../../../common/utils/getLanguageById.js";

import {
  createEmailDraftSchema,
  createAndSendEmailSchema,
  sendEmailSchema,
  updateEmailSchema,
} from "./email-notification.validator.js";

class EmailNotificationController {
  
  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const sendImmediately = req.body.send_immediately === true || req.body.send_immediately === "true";

      // Validate body
      const parsedBody = sendImmediately ? await createAndSendEmailSchema.parseAsync(req.body) : await createEmailDraftSchema.parseAsync(req.body);

      const files = Array.isArray(req.files) ? req.files : req.files?.attachments || req.files?.["attachments[]"] || [];
      const result = await EmailNotificationService.create({body: parsedBody, files,  sendImmediately, senderId: req.user.id });

      return res.status(201).json(
        successResponse(t(lang, "email", sendImmediately ? "EMAIL_CREATED_AND_SENT" : "EMAIL_DRAFT_CREATED"), result));
    } catch (error) {
      next(error);
    }
  };

  send = async (req, res, next) => {
    try {
      const result = await EmailNotificationService.send(req.params.id);

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

      const result = await EmailNotificationService.list({ page, limit, search });

      return res.status(200).json(successResponse("Success", result ) );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const result = await EmailNotificationService.getById(req.params.id);

      return res.status(200).json(
        successResponse(
          "Success",
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

      const parsedBody = await updateEmailSchema.parseAsync(req.body);

      const files = Array.isArray(req.files) ? req.files : req.files?.attachments || req.files?.["attachments[]"] || [];

      const sendImmediately = req.body.send_immediately === true || req.body.send_immediately === "true";

      const result = await EmailNotificationService.update({id: req.params.id, body: parsedBody, files, sendImmediately});

      return res.status(200).json(successResponse(t(lang, "email", "EMAIL_UPDATE_SUCCESS"),result));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

      await EmailNotificationService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'email', 'EMAIL_DELETE_SUCCESS')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new EmailNotificationController();