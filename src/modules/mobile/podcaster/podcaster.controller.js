import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import podcasterService from './podcaster.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';

class PodcasterController {

    async getPodcasterProfile(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);
            const { id } = req.params;
            const customerId = req.user?.id;

            const result = await podcasterService.getPodcasterProfile(id, customerId, lang);

            res.json(
                successResponse(
                    t(lang, "podcaster", "PODCASTER_PROFILE_FETCHED"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }

    async toggleFollow(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const customerId = req.user.id;
            const { podcasterId } = req.body;

            const result = await podcasterService.toggleFollowPodcaster(
                customerId,
                podcasterId
            );

            res.json(
                successResponse(
                    result.followed
                        ? t(lang, "podcaster", "PODCASTER_FOLLOWED")
                        : t(lang, "podcaster", "PODCASTER_UNFOLLOWED"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }

    async getFollowedPodcasters(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const customerId = req.user.id;

            const page = req.query.page ? Number(req.query.page) : null;
            const limit = req.query.limit ? Number(req.query.limit) : null;
            const search = req.query.search || '';

            const result = await podcasterService.getFollowedPodcasters(customerId, {
                page,
                limit,
                search,
                lang
            });

            res.json(
                successResponse(
                    t(lang, "podcaster", "FOLLOWED_PODCASTERS_FETCHED"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }


}

export default new PodcasterController();