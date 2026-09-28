import HttpError from '../../../common/errors/http.error.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import commonService from './common.service.js';

class commonController {
  // Get Google Admob Setting ( Enable/Disable )
  async getGoogleAdmobSettings(req, res, next) {
    try {
      const data = await commonService.getGoogleAdmobSettings();
      res.json(successResponse("success", data));
    } catch (e) {
      next(e);
    }
  }

  // Get Audio Ads
  async getInternalAudioAds(req, res, next) {
    try {
      const data = await commonService.getInternalAudioAds(req.user.id);
      res.json(successResponse("success", data));
    } catch (e) {
      next(e);
    }
  }

  // Get Banner Ads
  async getBanners(req, res, next) {
    try {
      const data = await commonService.getBanners(req.user.id);
      res.json(successResponse("success", data));
    } catch (e) {
      next(e);
    }
  }
}

export default new commonController();