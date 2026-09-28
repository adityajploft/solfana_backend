import HttpError from '../../../common/errors/http.error.js';

const validateBecomePartner = async (req, res, next) => {
  try {
    const { status, email } = req.body;

    if (status === undefined || status === null) {
      throw new HttpError(
        400,
        'STATUS_REQUIRED',
        'status is required',
        'common'
      );
    }

    if (typeof status !== 'boolean') {
      throw new HttpError(
        400,
        'STATUS_MUST_BE_BOOLEAN',
        'status must be boolean',
        'common'
      );
    }

    if (!email) {
      throw new HttpError(
        400,
        'EMAIL_REQUIRED',
        'email is required',
        'common'
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new HttpError(
        400,
        'INVALID_EMAIL',
        'invalid email format',
        'common'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default validateBecomePartner;