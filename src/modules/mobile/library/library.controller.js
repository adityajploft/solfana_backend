import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import libraryService from './library.service.js';

class LibraryController {
    async index(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await libraryService.index(
                req.user.id,
                req.query,
                req.user?.languageId,
                lang
            );

            res.json(
                successResponse(
                    t(lang, 'library', 'LIBRARY_FETCHED'),
                    result
                )
            );
        } catch (e) {
            next(e);
        }
    }

    async toggleLibrary(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await libraryService.toggleLibrary(
                req.user.id,
                req.body,
                lang
            );

            let message = '';

            if (result.action === 'added') {
                message =
                    req.body.entityType === 'ALBUM'
                        ? t(lang, 'library', 'ALBUM_ADDED_TO_LIBRARY')
                        : t(lang, 'library', 'TRACK_ADDED_TO_LIBRARY');
            } else {
                message =
                    req.body.entityType === 'ALBUM'
                        ? t(lang, 'library', 'ALBUM_REMOVED_FROM_LIBRARY')
                        : t(lang, 'library', 'TRACK_REMOVED_FROM_LIBRARY');
            }

            res.json(successResponse(message));
        } catch (e) {
            next(e);
        }
    }

    async toggleFavorite(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await libraryService.toggleFavorite(
                req.user.id,
                req.body
            );

            let message = '';

            if (result.action === 'added') {
                message =
                    req.body.entityType === 'ALBUM'
                        ? t(lang, 'library', 'ALBUM_ADDED_TO_FAVORITE')
                        : t(lang, 'library', 'TRACK_ADDED_TO_FAVORITE');
            } else {
                message =
                    req.body.entityType === 'ALBUM'
                        ? t(lang, 'library', 'ALBUM_REMOVED_FROM_FAVORITE')
                        : t(lang, 'library', 'TRACK_REMOVED_FROM_FAVORITE');
            }

            res.json(successResponse(message));
        } catch (e) {
            next(e);
        }
    }

    async toggleLike(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await libraryService.toggleLike(
                req.user.id,
                req.body
            );

            let message = '';

            if (result.action === 'added' || result.action === 'updated') {
                if (req.body.type === 'LIKE') {
                    message =
                        req.body.entityType === 'ALBUM'
                            ? t(lang, 'library', 'ALBUM_LIKED_SUCCESS')
                            : t(lang, 'library', 'TRACK_LIKED_SUCCESS');
                } else {
                    message =
                        req.body.entityType === 'ALBUM'
                            ? t(lang, 'library', 'ALBUM_DISLIKED_SUCCESS')
                            : t(lang, 'library', 'TRACK_DISLIKED_SUCCESS');
                }
            } else {
                if (result.previousType === 'LIKE') {
                    message =
                        req.body.entityType === 'ALBUM'
                            ? t(lang, 'library', 'ALBUM_LIKE_REMOVED_SUCCESS')
                            : t(lang, 'library', 'TRACK_LIKE_REMOVED_SUCCESS');
                } else {
                    message =
                        req.body.entityType === 'ALBUM'
                            ? t(lang, 'library', 'ALBUM_DISLIKE_REMOVED_SUCCESS')
                            : t(lang, 'library', 'TRACK_DISLIKE_REMOVED_SUCCESS');
                }
            }

            res.json(successResponse(message));
        } catch (e) {
            next(e);
        }
    }


    async seeAllFavorites(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await libraryService.seeAllFavorites(
                req.user.id,
                req.query,
                req.user?.languageId,
                lang
            );

            res.json(
                successResponse(
                    t(lang, 'library', 'FAVORITES_FETCHED'),
                    result
                )
            );
        } catch (e) {
            next(e);
        }
    }

    async seeAllLikes(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await libraryService.seeAllLikes(
                req.user.id,
                req.query,
                req.user.languageId,
                lang
            );

            res.json(
                successResponse(
                    t(lang, 'library', 'LIKES_FETCHED'),
                    result
                )
            );
        } catch (e) {
            next(e);
        }
    }
}

export default new LibraryController();