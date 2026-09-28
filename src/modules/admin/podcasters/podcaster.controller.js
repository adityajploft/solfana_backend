import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { uploadToCDN } from '../../../common/utils/globalUploader.js';
import PodcasterService from './podcaster.service.js';

class PodcasterController {
  create = async (req, res, next) => {
    try {
      
      const result = await PodcasterService.create(req.body, req.file);
      res.status(201).json(
        successResponse(
          t(req.lang, 'podcaster', 'PODCASTER_CREATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  index = async (req, res, next) => {
    try {
      const { page, limit, search } = req.query;

      const result = await PodcasterService.index({
        page,
        limit,
        search,
        lang: req.lang,
      });

      res.json(
        successResponse(
          t(req.lang, 'podcaster', 'PODCASTER_LIST'),
          {
            records: result.records,
            pagination: result.pagination
          })
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const result = await PodcasterService.show(req.params.id, req.lang);
      res.json(
        successResponse(
          t(req.lang, 'podcaster', 'PODCASTER_DETAIL'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await PodcasterService.update(
        req.params.id,
        req.body,
        req.file
      );
      res.json(
        successResponse(
          t(req.lang, 'podcaster', 'PODCASTER_UPDATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      await PodcasterService.remove(req.params.id);
      res.json(
        successResponse(
          t(req.lang, 'podcaster', 'PODCASTER_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new PodcasterController();
