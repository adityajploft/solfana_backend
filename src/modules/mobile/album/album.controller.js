import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import albumService from './album.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';

class AlbumController {

  async getAlbumTracks(req, res, next) {
    try {
      const { albumId } = req.params;
      const lang = await getUserLanguage(req.user?.languageId);

      const result = await albumService.getAlbumTracks(
        albumId,
        req.user?.languageId,
        req.query,
        req.user?.id
      );

      res.json(
        successResponse(
          t(lang, 'album', 'TRACKS_FETCHED'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async AlbumDetails(req, res, next) {
    try {
      const { albumId } = req.params;

      const lang = await getUserLanguage(req.user?.languageId);

      const result = await albumService.getAlbumDetails(
        albumId,
        req.user?.id,
        lang
      );

      res.json(
        successResponse(
          t(lang, 'album', 'ALBUM_DETAIL'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }
}

export default new AlbumController();