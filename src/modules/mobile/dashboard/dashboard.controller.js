import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import HttpError from '../../../common/errors/http.error.js';
import dashboardService from './dashboard.service.js';

class CustomerDashboardController {

  async getDashboard(req, res, next) {
    try {
      const customerId = req.user?.id;
      const { type } = req.query;
      if (!customerId) {
        throw new HttpError(401, 'UNAUTHORIZED', 'unauthorized', 'auth');
      }

      const lang = await getUserLanguage(req.user?.languageId);

      const data = await dashboardService.getDashboard(customerId, lang, type);

      res.json(successResponse(
        t(lang, 'dashboard', 'DASHBOARD_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getPodcasters(req, res, next) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getPodcasters(page, limit, languageId, search);

      res.json(successResponse(
        t(lang, 'dashboard', 'PODCASTERS_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getBestPodcasts(req, res, next) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getBestPodcasts(page, limit, languageId, search);

      res.json(successResponse(
        t(lang, 'dashboard', 'BEST_PODCASTS_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getAudiobooks(req, res, next) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getAudiobooks(page, limit, languageId, search);

      res.json(successResponse(
        t(lang, 'dashboard', 'AUDIOBOOKS_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getRecommendedForYou(req, res, next) {
    try {
      const customerId = req.user?.id;
      const { page = 1, limit = 10, search } = req.query;

      if (!customerId) {
        throw new HttpError(401, 'UNAUTHORIZED', 'unauthorized', 'auth');
      }

      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getRecommendedForYou(customerId, page, limit, languageId, search);

      res.json(successResponse(
        t(lang, 'dashboard', 'RECOMMENDED_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getGenres(req, res, next) {
    try {
      const { type, page = 1, limit = 10, search } = req.query;
      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getGenres(type, page, limit, languageId, search);

      res.json(successResponse(
        t(lang, 'dashboard', 'GENRES_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getRecentlyPlayed(req, res, next) {
    try {
      const customerId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;

      if (!customerId) {
        throw new HttpError(401, 'UNAUTHORIZED', 'unauthorized', 'auth');
      }

      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getRecentlyPlayed(
        customerId,
        page,
        limit,
        languageId
      );

      res.json(successResponse(
        t(lang, 'dashboard', 'RECENTLY_PLAYED_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

  async getExploreTrackAll(req, res, next) {
    try {
      const customerId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;

      const type = req.params.type;
      if (!type || !["podcast", "audiobook"].includes(type)) {
        throw new HttpError(401, 'INVALID_TYPE', 'invalid_type', 'dashboard');
      }

      if (!customerId) {
        throw new HttpError(401, 'UNAUTHORIZED', 'unauthorized', 'auth');
      }

      const lang = await getUserLanguage(req.user?.languageId);
      const languageId = req.user?.languageId || 1;

      const data = await dashboardService.getExploreTrackAll(customerId, page, limit, languageId, type);

      res.json(successResponse(
        t(lang, 'dashboard', 'RECENTLY_PLAYED_FETCHED'),
        data
      ));

    } catch (e) {
      next(e);
    }
  }

}

export default new CustomerDashboardController();
