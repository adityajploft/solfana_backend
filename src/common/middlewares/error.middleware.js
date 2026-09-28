import { ZodError } from 'zod';
import { t } from '../services/i18n/i18n.service.js';
import { getUserLanguage } from '../utils/getLanguageById.js';
import { handlePrismaError } from '../utils/prismaErrorHandler.js';
import logger from '../services/logger.service.js';

export const errorHandler = async (err, req, res, next) => {
  console.error(err);

  if ((err.code && err.code.startsWith('P')) || (err.name && err.name.startsWith('Prisma'))) {
    err = handlePrismaError(err);
  }

  const status = err.status || 500;
  

  logger.error({
    message: err.message,
    status,
    endpoint: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || null,
    body: req.body,
    query: req.query,
    params: req.params,
    stack: err.stack,
  });

  let lang = req.lang || 'en';

  if (req.user?.languageId) {
    const userLang = await getUserLanguage(req.user.languageId);
    if (userLang) {
      lang = userLang;
    }
  }

  //  ZOD ERROR HANDLING
  if (err instanceof ZodError) {

    const issues = err.issues || []; // ✅ safe fallback

    const errors = issues.reduce((acc, e) => {
      const field = e.path.join('.') || 'general';

      if (!acc[field]) acc[field] = [];
      const message = e.message.replace(/_/g, ' ')        // replace _ with space
    .replace(/\s+/g, ' ')      // remove extra spaces
    .trim();
      acc[field].push(message);

      return acc;
    }, {});

    return res.status(422).json({
      success: false,
      message: "The given data was invalid.",
      errors
    });
  }

  const isPrismaRawMessage =
    err.message &&
    (
      err.message.includes('Invalid value') ||
      err.message.includes('Argument') ||
      err.message.includes('Expected')
    );

  const message = isPrismaRawMessage
    ? err.message 
    : t(
        lang,
        err.module || 'common',
        err.message || 'INTERNAL_SERVER_ERROR'
      );

  res.status(status).json({
    success: false,
    error_type: err.errorType || 'server_error',
    message,
    errors: err.errors || [],
  });
};