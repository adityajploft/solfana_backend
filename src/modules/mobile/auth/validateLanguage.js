import { body, validationResult } from 'express-validator';
import prisma from '../../../config/db.config.js';

export const validateLanguage = [
  body('language')
    .notEmpty()
    .custom(async (lang) => {
      const language = await prisma.language.findUnique({ where: { lang } });
      if (!language) throw new Error('Invalid language');
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];
