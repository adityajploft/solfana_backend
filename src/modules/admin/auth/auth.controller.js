import authService from './auth.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { t } from '../../../common/services/i18n/i18n.service.js';

class AuthController {
  login = async (req, res, next) => {
    try {
        const data = await authService.login(req.body);
        res.status(200).json(
          successResponse(
            t(req.lang, 'auth', 'LOGIN_SUCCESS'),
            data
          )
        );

    } catch (error) {
        next(error); 
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
        await authService.forgotPassword(req.body, req.lang);
        res.json(
          successResponse(
            t(req.lang, 'auth', 'FORGOT_PASSWORD_SENT')
          )
        );
    } catch (error) {
        next(error); 
    }
  };

  resetPassword = async (req, res, next) => {
    try {
        await authService.resetPassword(req.body);
        res.json(
          successResponse(
            t(req.lang, 'auth', 'PASSWORD_RESET_SUCCESS'),
            []
          )
        );
    } catch (error) {
        next(error); 
    }   
  };

  logout = async (req, res, next) => {
    try {
      const result = await authService.logout(req.user.id);
      res.json(
        successResponse(
          t(req.lang, 'auth', 'LOGOUT_SUCCESS')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  updateLanguage = async (req, res, next) => {
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
  };
  
}

export default new AuthController();
