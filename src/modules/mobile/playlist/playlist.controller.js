import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import playlistService from './playlist.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';

class PlaylistController {

    async create(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await playlistService.create(
                req.user.id,
                req.body
            );

            res.json(
                successResponse(
                    t(lang, 'playlist', 'PLAYLIST_CREATED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async list(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const { page, limit, search } = req.query;

            const result = await playlistService.list({
                customerId: req.user.id,
                page,
                limit,
                search
            });

            res.json(
                successResponse(
                    t(lang, 'playlist', 'PLAYLISTS_FETCHED'),
                    {
                        records: result.records,
                        pagination: result.pagination
                    }
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await playlistService.delete(
                req.user.id,
                req.params.playlistId
            );

            res.json(
                successResponse(
                    t(lang, 'playlist', 'PLAYLIST_DELETED'),
                    // result
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async addTracks(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);
            const result = await playlistService.addTracks(
                req.user.id,
                req.params.playlistId,
                req.body.trackIds
            );

            res.json(successResponse(
                t(lang, 'playlist', 'TRACK_ADDED_SUCCESS'),
                result
            ));
        } catch (error) {
            next(error);
        }
    }

    async removeTrack(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await playlistService.removeTrack(
                req.user.id,
                req.query.playlistId,
                req.params.trackId
            );

            res.json(
                successResponse(
                    t(lang, 'playlist', 'TRACK_REMOVED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async details(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const result = await playlistService.details(
                req.user.id,
                req.params.playlistId,
                lang
            );

            res.json(
                successResponse(
                    t(lang, 'playlist', 'PLAYLIST_DETAILS_FETCHED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async getPlaylistTracks(req, res, next) {
        try {
            const lang = await getUserLanguage(req.user?.languageId);

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await playlistService.getPlaylistTracks(
                req.user.id,
                req.params.playlistId,
                lang,
                page,
                limit
            );

            res.json(
                successResponse(
                    t(lang, 'playlist', 'PLAYLIST_DETAILS_FETCHED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    }

}

export default new PlaylistController();