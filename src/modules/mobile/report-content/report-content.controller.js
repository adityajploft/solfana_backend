import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import ReportContentService from './report-content.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';

class ReportContentController {

    async getReportReasons(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await ReportContentService.getReportReasons(lang);

            res.json(
                successResponse(
                    t(lang, "report", "REPORT_REASONS_FETCHED"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }

    async reportContent(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const customerId = req.user.id;

            const result = await ReportContentService.reportContent(customerId, req.body);

            res.json(
                successResponse(
                    t(lang, "report", "CONTENT_REPORTED_SUCCESS"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }


}

export default new ReportContentController();