import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import permissionService from './permission.service.js';

class PermissionsController {
    index = async (req, res, next) => {
        try {
            const page = req.query.page ? Number(req.query.page) : null;
            const limit = req.query.limit ? Number(req.query.limit) : null;
            const search = req.query.search || '';

            const result = await permissionService.index({
                page,
                limit,
                search
            });

            res.status(200).json(
                successResponse(
                    t(req.lang, 'permission', 'PERMISSION_LIST'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };


    create = async (req, res, next) => {
        try {
            const result = await permissionService.create(req.body);
            res.status(200).json(
                successResponse(
                    t(req.lang, 'permission', 'PERMISSION_CREATED'),
                    result.data
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
                    message: t(req.lang, 'permission', 'INVALID_ID')
                });
            }
            await permissionService.remove(id);
            res.status(200).json(
                successResponse(
                    t(req.lang, 'permission', 'PERMISSION_DELETED')
                )
            );
        } catch (error) {
            next(error);
        }
    };
}

export default new PermissionsController();
