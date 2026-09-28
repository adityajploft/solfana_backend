import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import AudioAdService from './audio-ad.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import HttpError from '../../../common/errors/http.error.js';
import { createAudioAdSchema, updateAudioAdSchema } from './audio-ad.validator.js';
import { id } from 'zod/v4/locales';

class AudioAdController {


  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || 'fr';

      // validate body
      const parsedBody = await createAudioAdSchema(lang).parseAsync(req.body);

      const result = await AudioAdService.create({ body: parsedBody, files: req.files });

      return res.status(201).json(
        successResponse(t(lang, 'audio-ad', 'AUDIOAD_CREATED'), result )
      );

    } catch (error) {
      next(error);
    }
  };

  index = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'fr';

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await AudioAdService.index(lang, { page, limit, search });

      res.json(
        successResponse(
          t(lang, 'audio-ad', 'AUDIOAD_LIST'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'fr';

      const result = await AudioAdService.show(req.params.id, lang);

      res.json(
        successResponse(
          t(lang, 'audio-ad', 'AUDIOAD_DETAIL'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'fr';

      // validate body
      const parsedBody = await updateAudioAdSchema(req.params.id, lang).parseAsync(req.body);

      const result = await AudioAdService.update({id: req.params.id, body: parsedBody, files: req.files });

      res.json(successResponse(t(lang, 'audio-ad', 'AUDIOAD_UPDATED'), result));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'fr';

      await AudioAdService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'audio-ad', 'AUDIOAD_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  changeStatus = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'fr';

      const updatedData = await AudioAdService.changeStatus(req.params.id);

      res.json(
        successResponse(
          t(lang, 'audio-ad', 'AUDIO_AD_STATUS_CHANGE'),
          updatedData
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new AudioAdController();