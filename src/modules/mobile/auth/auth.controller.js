import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { uploadToCDN } from '../../../common/utils/globalUploader.js';
import authService from './auth.service.js';

class AuthController {
  async loginWithEmail(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const { email } = req.body;

      await authService.loginWithEmail(email, lang);

      res.json(
        successResponse(
          t(lang, 'auth', 'OTP_SENT')
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async verifyLoginOtp(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const result = await authService.verifyLoginOtp(req.body);

      let messageKey = result.userExists ? 'LOGIN_SUCCESS' : 'CONTINUE_SIGNUP';

      res.json(
        successResponse(
          t(lang, 'auth', messageKey),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async signupPhone(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const tokenData = req.user;
      const result = await authService.signupPhone(tokenData, req.body.phone_number);

      res.json(
        successResponse(
          t(lang, 'auth', 'PHONE_SAVED'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async createPassword(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const tokenData = req.user;
      const { password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        throw new HttpError(400, 'PASSWORD_MISMATCH', 'password_mismatch', 'common');
      }

      const result = await authService.createPassword(tokenData, { password }, lang);

      res.json(
        successResponse(
          t(lang, 'auth', 'PASSWORD_CREATED'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async loginWithPassword(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const result = await authService.loginWithPassword(req.body);
      res.json(
        successResponse(
          t(lang, 'auth', 'LOGIN_SUCCESS'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async forgotPasswordEmail(req, res, next) {
    try {
      const lang = req.lang || 'en';
      await authService.forgotPasswordEmail(req.body.email, lang);
      res.json(
        successResponse(
          t(lang, 'auth', 'OTP_SENT')
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async verifyForgotPasswordOtp(req, res, next) {
    try {
      const lang = req.lang || 'en';
      const result = await authService.verifyForgotPasswordOtp(req.body);
      res.json(
        successResponse(
          t(lang, 'auth', 'OTP_VERIFIED'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const lang = req.lang || 'en';
      await authService.resetPassword(req.body);
      res.json(
        successResponse(
          t(lang, 'auth', 'PASSWORD_RESET_SUCCESS')
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async logout(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const { deviceId } = req.body || {};

      if (deviceId) {
        await authService.logout(req.user.id, deviceId);
      } else {
        await authService.logout(req.user.id);
      }

      res.json(
        successResponse(
          t(lang, 'auth', 'LOGOUT_SUCCESS')
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async me(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const result = await authService.me(req.user.id);
      res.json(
        successResponse(
          t(lang, 'auth', 'PROFILE_FETCHED'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);

      let profileImageUrl;

      if (req.file) {
        const uploadResult = await uploadToCDN(
          req.file,
          'CUSTOMER',
          'PROFILE_IMAGE',
          { optimize: true }
        );

        if (!uploadResult.success) {
          throw new Error('Profile image upload failed');
        }

        profileImageUrl = uploadResult.cdnUrl?.startsWith('http')
        ? uploadResult.cdnUrl
        : `https://${uploadResult.cdnUrl}`;
      }

      const updateData = {
        ...req.body,
        ...(profileImageUrl && { profileImage: profileImageUrl })
      };

      const result = await authService.updateProfile(
        req.user?.id,
        updateData
      );

      res.json(
        successResponse(
          t(lang, 'auth', 'PROFILE_UPDATED'),
          // result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async changePassword(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      
      const { oldPassword, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        throw new HttpError(400, 'PASSWORD_MISMATCH', 'password_mismatch', 'auth');
      }

      const result = await authService.changePassword(req.user.id, {
        oldPassword,
        newPassword
      });

      res.json(
        successResponse(
          t(lang, 'auth', 'PASSWORD_CHANGED'),
          // result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async updateLanguage(req, res, next) {
    try {
      const { language } = req.body;
      const result = await authService.updateLanguage(req.user.id, language);
      res.json(
        successResponse(
          t(language, 'auth', 'LANGUAGE_UPDATED'),
          // result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async saveUserInterests(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      await authService.saveUserInterests(req.user.id, req.body.interest_ids);
      res.json(
        successResponse(
          t(lang, 'auth', 'INTERESTS_SAVED')
        )
      );
    } catch (e) {
      next(e);
    }
  }
}

export default new AuthController();