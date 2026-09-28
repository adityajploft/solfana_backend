import { t } from '../../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../../common/utils/apiResponse.js';
import categoryService from './category.service.js';
import HttpError from '../../../../common/errors/http.error.js';
import uploadsService from '../../../../common/services/uploads.service.js';

class CategoryController {
  create = async (req, res, next) => {
    try {
      const { type } = req.body;
      
      // Validate type
      if (!['PODCAST', 'AUDIOBOOK'].includes(type)) {
        throw new HttpError(400, 'INVALID_TYPE', 'invalid_category_type', 'category');
      }

      const result = await categoryService.create(req.body);

      // If image file is uploaded, save it
      if (req.file) {
        const upload = await uploadsService.saveUpload({
          file: req.file,
          uploadType: 'CATEGORY_IMAGE',
          entityType: 'CATEGORY',
          entityId: result.id,
        });

        // Add upload info to result
        result.image = {
          id: upload.id,
          filename: upload.filename,
          url: `/uploads/category-images/${upload.filename}`,
          cdnUrl: upload.cdnUrl,
        };
      }

      res.status(201).json(
        successResponse(
          t(req.lang, 'category', 'CATEGORY_CREATED'),
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
      
      const result = await categoryService.index(type, req.lang);
      res.json(
        successResponse(
          t(req.lang, 'category', 'CATEGORY_LIST'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const result = await categoryService.show(req.params.id, req.lang);
      res.json(
        successResponse(
          t(req.lang, 'category', 'CATEGORY_DETAIL'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await categoryService.update(req.params.id, req.body);

      if (req.file) {
        const upload = await uploadsService.replaceUpload(
          'CATEGORY',
          id,
          'CATEGORY_IMAGE',
          req.file
        );

        result.image = {
          id: upload.id,
          filename: upload.filename,
          url: `/uploads/category-images/${upload.filename}`,
          cdnUrl: upload.cdnUrl,
        };
      }

      res.json(
        successResponse(
          t(req.lang, 'category', 'CATEGORY_UPDATED'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const uploads = await uploadsService.getUploadsByEntity('CATEGORY', id);

      await Promise.all(
        uploads.map(upload => uploadsService.deleteUpload(upload.id))
      );

      await categoryService.remove(req.params.id);
      res.json(
        successResponse(
          t(req.lang, 'category', 'CATEGORY_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new CategoryController();
