import contentReportService from './content-reports.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';

class ContentReportController {

    index = async (req, res, next) => {
        try {
            const { page, limit, search } = req.query;

            const result = await contentReportService.index({
                page: Number(page) || 1,
                limit: Number(limit) || 10,
                search,
            });

            res.json(
                successResponse(
                    "Success",
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    show = async (req, res, next) => {
        try {
            const result = await contentReportService.show(req.params.id, req.lang);

            res.json(
                successResponse(
                    "Success",
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };
}

export default new ContentReportController();