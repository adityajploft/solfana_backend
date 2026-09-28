import HttpError from '../../../common/errors/http.error.js';

export const validateCreatePodcaster = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      bio,
      isActive,
      isVerified,
    } = req.body;

    if (!name || name.trim().length < 2) {
      throw new HttpError(400, 'PODCASTER_NAME_REQUIRED', 'validation_error', 'podcaster');
    }

    if (name.trim().length > 100) {
      throw new HttpError(400, 'PODCASTER_NAME_TOO_LONG', 'validation_error', 'podcaster');
    }

    if (!email || !email.trim()) {
      throw new HttpError(400, 'PODCASTER_EMAIL_REQUIRED', 'validation_error', 'podcaster');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpError(400, 'INVALID_EMAIL_FORMAT', 'validation_error', 'podcaster');
    }

    if (!password || password.length < 6) {
      throw new HttpError(400, 'PASSWORD_TOO_SHORT', 'validation_error', 'podcaster');
    }

    if (password.length > 100) {
      throw new HttpError(400, 'PASSWORD_TOO_LONG', 'validation_error', 'podcaster');
    }

    if (!phone || phone.trim().length < 8 || phone.trim().length > 15) {
      throw new HttpError(400, 'INVALID_PHONE_NUMBER', 'validation_error', 'podcaster');
    }

    if (!/^[0-9+\-() ]+$/.test(phone)) {
      throw new HttpError(400, 'INVALID_PHONE_FORMAT', 'validation_error', 'podcaster');
    }

    if (!bio || bio.trim().length < 10) {
      throw new HttpError(400, 'PODCASTER_BIO_TOO_SHORT', 'validation_error', 'podcaster');
    }

    if (bio.trim().length > 1000) {
      throw new HttpError(400, 'PODCASTER_BIO_TOO_LONG', 'validation_error', 'podcaster');
    }

    req.body.isActive = isActive === true || isActive === 'true';
    req.body.isVerified = isVerified === true || isVerified === 'true';

    next();
  } catch (error) {
    next(error);
  }
};

export const validateUpdatePodcaster = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      bio,
      isActive,
      isVerified,
    } = req.body;

    if (name) {
      if (name.trim().length < 2) {
        throw new HttpError(400, 'PODCASTER_NAME_REQUIRED', 'validation_error', 'podcaster');
      }

      if (name.trim().length > 100) {
        throw new HttpError(400, 'PODCASTER_NAME_TOO_LONG', 'validation_error', 'podcaster');
      }
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new HttpError(400, 'INVALID_EMAIL_FORMAT', 'validation_error', 'podcaster');
      }
    }

    if (password) {
      if (password.length < 6) {
        throw new HttpError(400, 'PASSWORD_TOO_SHORT', 'validation_error', 'podcaster');
      }

      if (password.length > 100) {
        throw new HttpError(400, 'PASSWORD_TOO_LONG', 'validation_error', 'podcaster');
      }
    }

    if (phone) {
      if (phone.trim().length < 8 || phone.trim().length > 15) {
        throw new HttpError(400, 'INVALID_PHONE_NUMBER', 'validation_error', 'podcaster');
      }

      if (!/^[0-9+\-() ]+$/.test(phone)) {
        throw new HttpError(400, 'INVALID_PHONE_FORMAT', 'validation_error', 'podcaster');
      }
    }

    if (bio) {
      if (bio.trim().length < 10) {
        throw new HttpError(400, 'PODCASTER_BIO_TOO_SHORT', 'validation_error', 'podcaster');
      }

      if (bio.trim().length > 1000) {
        throw new HttpError(400, 'PODCASTER_BIO_TOO_LONG', 'validation_error', 'podcaster');
      }
    }

    if (isActive !== undefined) {
      req.body.isActive = isActive === true || isActive === 'true';
    }

    if (isVerified !== undefined) {
      req.body.isVerified = isVerified === true || isVerified === 'true';
    }

    next();
  } catch (error) {
    next(error);
  }
};