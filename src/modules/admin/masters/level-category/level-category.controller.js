import levelCategoryService from './level-category.service.js';
import uploadsService from '../../../../common/services/uploads.service.js';
import { successResponse } from '../../../../common/utils/apiResponse.js';
import { t } from '../../../../common/services/i18n/i18n.service.js';
import { uploadToCDN } from '../../../../common/utils/globalUploader.js';

class LevelCategoryController {

    create = async (req, res, next) => {
        try {

            const result = await levelCategoryService.create(req.body, req.files);

            res.status(201).json(
                successResponse(
                    t(req.lang, 'category', 'CATEGORY_CREATED'),
                    result
                )
            );

        } catch (err) {
            next(err);
        }
    };




    index = async (req, res, next) => {
        try {
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 10;
            const search = req.query.search || '';

            const result = await levelCategoryService.index({
                page,
                limit,
                search
            });

            res.json(
                successResponse(
                    t(req.lang, 'category', 'CATEGORY_LIST'),
                    result
                )
            );
        } catch (err) {
            next(err);
        }
    };


    update = async (req, res, next) => {
        try {
            const result = await levelCategoryService.update(
                req.params.id,
                req.body,
                req.files
            );

            res.json(
                successResponse(
                    t(req.lang, 'category', 'CATEGORY_UPDATED'),
                    result
                )
            );
        } catch (err) {
            next(err);
        }
    };

    remove = async (req, res, next) => {
        try {
            await levelCategoryService.remove(req.params.id);

            res.json(
                successResponse(
                    t(req.lang, 'category', 'CATEGORY_DELETED')
                )
            );
        } catch (err) {
            next(err);
        }
    };

    async show(req, res, next) {
        try {
            const { id } = req.params;

            const category = await levelCategoryService.show(id);

            return res.status(200).json({
                success: true,
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }

    async updatePosition(req, res, next) {
        try {
            const { id } = req.params;
            const { position } = req.body;

            const result = await levelCategoryService.updatePosition(id, position);

            return res.status(200).json({
                success: true,
                message: 'Category position updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new LevelCategoryController();
