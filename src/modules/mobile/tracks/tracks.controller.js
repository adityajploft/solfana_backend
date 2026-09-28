import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import trackService from './tracks.service.js';

class TrackController {

  async TrackDetails(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const trackId = req.params.id;
      const customerId = req.user?.id;

      const result = await trackService.getTrackDetails(trackId, lang, customerId);

      res.json(
        successResponse(
          t(lang, "track", "TRACK_DETAIL"),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }

}

export default new TrackController();