import { validationResult } from 'express-validator';
import { t } from '../services/i18n/i18n.service.js';

export default function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    let lang = 'en';
    
    if (req.user?.languageId === 2) {
      lang = 'fr';
    } else if (req.lang) {
      lang = req.lang;
    }
    
    const translatedErrors = errors.array().map(error => {
      if (error.msg && error.msg === error.msg.toUpperCase() && error.msg.includes('_')) {
        return {
          ...error,
          msg: t(lang, 'auth', error.msg) || error.msg
        };
      }
      return error;
    });
    
    return res.status(400).json({
      success: false,
      error_type: 'validation_error',
      message: t(lang, 'common', 'VALIDATION_ERROR'),
      errors: translatedErrors,
    });
  }
  next();
}