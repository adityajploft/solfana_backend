import { ZodError } from 'zod';
import HttpError from '../errors/http.error.js';

export const validate = (schema) => (req, res, next) => {
  try {
    //Support multipart/form-data where JSON is sent in `data` field
    if (
      req.body?.data &&
      typeof req.body.data === 'string' &&
      req.body.data.trim().startsWith('{')
    ) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return next(
          new HttpError(
            422,
            'INVALID_JSON_DATA',
            'validation_error',
            'common'
          )
        );
      }
    }

    const parsed = schema.parse(req.body);
    req.body = parsed;

    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];

      return next(
        new HttpError(
          422,
          first.message || 'VALIDATION_ERROR',
          'validation_error',
          'common',
          err.issues
        )
      );
    }

    next(err);
  }
};
