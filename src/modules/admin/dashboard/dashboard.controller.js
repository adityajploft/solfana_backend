import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import DashboardService from './dashboard.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import HttpError from '../../../common/errors/http.error.js';
import dayjs from 'dayjs';

// Date Parse

const getDateFilter = (query) => {
  let { start_date, end_date } = query;

  // If NOT provided → default to current month
  if (!start_date && !end_date) {
    return {
      start: dayjs().startOf('month').toDate(),
      end: dayjs().endOf('month').toDate()
    };
  }

  return {
    start: start_date ? dayjs(start_date).startOf('day').toDate() : null,
    end: end_date ? dayjs(end_date).endOf('day').toDate() : null
  };
};

class DashboardController {

  // ================= COUNTS =================
  getCounts = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      const { start, end } = getDateFilter(req.query);

      const result = await DashboardService.getCounts({ start: null, end: null });

      res.json(successResponse(t(lang, 'dashboard'), result));
    } catch (error) {
      next(error);
    }
  };

  // ================= GRAPHS =================
  getListeningTimeGraph = async (req, res, next) => {
    try {
      const { start, end } = getDateFilter(req.query);

      const result = await DashboardService.getListeningTimeGraph({ start, end });

      res.json(successResponse('Listening Time Graph', result));
    } catch (error) {
      next(error);
    }
  };

  getUserGrowthGraph = async (req, res, next) => {
    try {
      const { start, end } = getDateFilter(req.query);

      const result = await DashboardService.getUserGrowthGraph({ start, end });

      res.json(successResponse('User Growth Graph', result));
    } catch (error) {
      next(error);
    }
  };

  getConversionGraph = async (req, res, next) => {
    try {
      const { start, end } = getDateFilter(req.query);

      const result = await DashboardService.getConversionGraph({ start, end });

      res.json(successResponse('Conversion Graph', result));
    } catch (error) {
      next(error);
    }
  };

  // ================= INSIGHTS =================
  getTopTracks = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      const { start, end } = getDateFilter(req.query);

      const result = await DashboardService.getTopTracks({ start: null, end: null, lang });

      res.json(successResponse('Top Tracks', result));
    } catch (error) {
      next(error);
    }
  };

  getListeningPerUser = async (req, res, next) => {
    try {
      const { start, end } = getDateFilter(req.query);

      const result = await DashboardService.getListeningPerUser({ start, end });

      res.json(successResponse('Listening Per User', result));
    } catch (error) {
      next(error);
    }
  };

  // ================= STORAGE =================
  getStorageUsage = async (req, res, next) => {
    try {
      const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
      
      const result = await DashboardService.getStorageUsage();

      res.json(
        successResponse(
          t(lang, 'dashboard'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

}

export default new DashboardController();