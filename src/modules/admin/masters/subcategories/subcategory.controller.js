import { t } from '../../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../../common/utils/apiResponse.js';
import subCategoryService from './subcategory.service.js';
import HttpError from '../../../../common/errors/http.error.js';

class SubCategoryController {
  create = async (req, res, next) => {
    try {
      const result = await subCategoryService.create(req.body);
      res.status(201).json(
        successResponse(
          t(req.lang, 'subCategory', 'SUBCATEGORY_CREATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  index = async (req, res, next) => {
    try {
      const { type } = req.query;
      
      if (type && !['PODCAST', 'AUDIOBOOK'].includes(type)) {
        throw new HttpError(400, 'INVALID_TYPE', 'invalid_category_type', 'category');
      }

      const result = await subCategoryService.index(type, req.lang);
      res.json(
        successResponse(
          t(req.lang, 'subCategory', 'SUBCATEGORY_LIST'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const result = await subCategoryService.show(req.params.id, req.lang);
      res.json(
        successResponse(
          t(req.lang, 'subCategory', 'SUBCATEGORY_DETAIL'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await subCategoryService.update(req.params.id, req.body);
      res.json(
        successResponse(
          t(req.lang, 'subCategory', 'SUBCATEGORY_UPDATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      await subCategoryService.remove(req.params.id);
      res.json(
        successResponse(
          t(req.lang, 'subCategory', 'SUBCATEGORY_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new SubCategoryController();
