import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { uploadToCDN } from '../../../common/utils/globalUploader.js';
import userService from './user.service.js';

class UserController {
  /* ============== ADMIN ============== */

  create = async (req, res, next) => {
    try {
      const result = await userService.create(req.body, req.file);
      res.status(201).json(
        successResponse(
          t(req.lang, 'user', 'USER_CREATED'),
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

      const result = await userService.index({
        page,
        limit,
        search,
      });

      res.status(200).json(
        successResponse(
          t(req.lang, 'user', 'USER_LIST'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const result = await userService.show(req.params.id);
      res.status(200).json(
        successResponse(
          t(req.lang, 'user', 'USER_DETAILS'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await userService.update(req.params.id, req.body,req.file);
      res.status(200).json(
        successResponse(
          t(req.lang, 'user', 'USER_UPDATED'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      
      const result = await userService.remove(req.params.id);
      res.status(200).json(
        successResponse(
          t(req.lang, 'user', 'USER_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  
}

export default new UserController();
