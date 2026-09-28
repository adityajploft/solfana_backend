import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import roleService from './role.service.js';

class RoleController {
  index = async (req, res, next) => {
    try {
      const { type } = req.query || {};
      
      const result = await roleService.index(type);
      res.status(200).json(
        successResponse(
          t(req.lang, 'role', 'ROLE_LIST'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: t(req.lang, 'role', 'INVALID_ID')
        });
      }

      const result = await roleService.show(id);

      res.status(200).json(
        successResponse(
          t(req.lang, 'role', 'ROLE_DETAIL'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const result = await roleService.create(req.body);
      res.status(201).json(
        successResponse(
          t(req.lang, 'role', 'ROLE_CREATED'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: t(req.lang, 'role', 'INVALID_ID')
        });
      }

      await roleService.update(id, req.body);

      res.status(200).json(
        successResponse(
          t(req.lang, 'role', 'ROLE_UPDATED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: t(req.lang, 'role', 'INVALID_ID')
        });
      }

      await roleService.remove(id);

      res.status(200).json(
        successResponse(
          t(req.lang, 'role', 'ROLE_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new RoleController();
