import { successResponse } from '../../../common/utils/apiResponse.js';
import TrackAnalyticsService from './track-analytics.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';

class TrackAnalyticsController {

  async start (req, res, next) {
    try {
      const customerId = req.user.id;
      const { trackId } = req.body;

      const data = await TrackAnalyticsService.startListening(customerId, trackId);

      res.json(successResponse('Success', data));
    } catch (err) {
      next(err);
    }
  };

  async progress(req, res, next) {
    try {
      const customerId = req.user.id;

      const data = await TrackAnalyticsService.updateProgress(customerId, req.body);

      res.json(successResponse('Success', data));
    } catch (err) {
      if (err.message === "LIMIT_REACHED") {
        return res.status(400).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  async status(req, res, next) {
    try {
      const customerId = req.user.id; // assuming auth middleware

      const data = await TrackAnalyticsService.getStatus(customerId);

      res.json(successResponse('Success', data));
    } catch (error) {
      next(error);
    }
  }

  async reward(req, res, next) {
    try {
      const customerId = req.user.id;

      const data = await TrackAnalyticsService.rewardAd(customerId);

      res.json(successResponse('Success', data));
    } catch (error) {
      next(error);
    }
  }


  async playTrack(req, res, next) {
    try {
      const userId = req.user.id;
      const lang = await getUserLanguage(req.user?.languageId);

      const data = await TrackAnalyticsService.playTrack({
        ...req.body,
        userId
      }, lang);

      res.json(successResponse('Success', data));
    } catch (error) {
      next(error);
    }
  }

  async nextQueue(req, res, next) {
     try {
      const userId = req.user.id;
      const lang = await getUserLanguage(req.user?.languageId);

      const data = await TrackAnalyticsService.getNext({
        ...req.query,
        userId
      }, lang);

      res.json(successResponse('Success', data));
    } catch (err) {
      next(err);
    }
  }

  async prevQueue(req, res, next) {
    try {
      const userId = req.user.id;
      const lang = await getUserLanguage(req.user?.languageId);

      const data = await TrackAnalyticsService.getPrev({
        ...req.query,
        userId
      }, lang);

      res.json(successResponse('Success', data));
    } catch (err) {
      next(err);
    }
  }
}

export default new TrackAnalyticsController();
