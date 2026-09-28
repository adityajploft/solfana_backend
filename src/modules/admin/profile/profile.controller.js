import { t } from "../../../common/services/i18n/i18n.service.js";
import { successResponse } from "../../../common/utils/apiResponse.js";
import { uploadToCDN } from "../../../common/utils/globalUploader.js";
import profileService from "./profile.service.js";

class ProfileController {

    /* ============== USER ============== */

  getProfile = async (req, res, next) => {
    try {
      const result = await profileService.getProfile(req.user.id);
      res.status(200).json(
        successResponse(
          t(req.lang, 'profile', 'PROFILE_FETCHED'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req, res, next) => {
    try {
      const data = { ...req.body };
      if (req.file) {
        const cdnResult = await uploadToCDN(
          req.file,
          'user',
          'profile-image',
          { optimize: true }
        );

        if (cdnResult.success) {
          data.profileImage = cdnResult.cdnUrl;
        }
      }
      const result = await profileService.updateProfile(req.user.id, data, req.user.roleId);
      res.status(200).json(
        successResponse(
          t(req.lang, 'profile', 'PROFILE_UPDATED'),
          result.data
        )
      );
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      await profileService.changePassword(req.user.id, req.body);
      res.status(200).json(
        successResponse(
          t(req.lang, 'profile', 'PASSWORD_CHANGED')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new ProfileController();