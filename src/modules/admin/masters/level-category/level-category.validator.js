import HttpError from '../../../../common/errors/http.error.js';

export const validateCreateLevelCategory = async (req, res, next) => {
  try {
    let { name, parentId, level, isActive, translations, bgColor1, bgColor2, gradientText } = req.body;

    if (!name || name.trim().length < 1) {
      throw new HttpError(400, 'CATEGORY_NAME_REQUIRED', 'validation_error', 'category');
    }


    if (level === undefined || level === null) {
      throw new HttpError(400, 'LEVEL_REQUIRED', 'validation_error', 'category');
    }

    level = Number(level);

    if (!Number.isInteger(level) || level <= 0) {
      throw new HttpError(400, 'INVALID_LEVEL', 'validation_error', 'category');
    }

    req.body.level = level;

    if (parentId !== undefined && parentId !== null) {
      if (typeof parentId !== 'string' || parentId.trim() === '') {
        throw new HttpError(400, 'INVALID_PARENT_ID', 'validation_error', 'category');
      }
    }

    if (bgColor1 !== undefined && bgColor1 !== null) {
      if (typeof bgColor1 !== 'string') {
          throw new HttpError(400, 'INVALID_BG_COLOR_1', 'validation_error', 'category');
      }

      req.body.bgColor1 = bgColor1.trim();
    }

    if (bgColor2 !== undefined && bgColor2 !== null) {
      if (typeof bgColor2 !== 'string') {
          throw new HttpError(400, 'INVALID_BG_COLOR_2', 'validation_error', 'category');
      }

      req.body.bgColor2 = bgColor2.trim();
    }

    if (gradientText !== undefined && gradientText !== null) {
      if (typeof gradientText !== 'string') {
          throw new HttpError(400, 'INVALID_GRADIENT_TEXT', 'validation_error', 'category');
      }

      req.body.gradientText = gradientText.trim();
    }

    next();
  } catch (error) {
    next(error);
  }
};


export const validateUpdateLevelCategory = async (req, res, next) => {
  try {
    const { name, parentId, level, isActive, bgColor1, bgColor2, gradientText } = req.body;

    if (Object.keys(req.body).length === 0 && !req.file) {
      throw new HttpError(400, 'UPDATE_DATA_REQUIRED', 'validation_error', 'category');
    }

    if (name !== undefined) {
      if (!name || name.trim().length < 1) {
        throw new HttpError(400, 'CATEGORY_NAME_REQUIRED', 'validation_error', 'category');
      }

    }

    if (level !== undefined) {
      const parsedLevel = Number(level);

      if (!Number.isInteger(parsedLevel) || parsedLevel <= 0) {
        throw new HttpError(400, 'INVALID_LEVEL', 'validation_error', 'category');
      }

      req.body.level = parsedLevel;
    }

    if (parentId !== undefined && parentId !== null) {
      if (typeof parentId !== 'string' || parentId.trim() === '') {
        throw new HttpError(400, 'INVALID_PARENT_ID', 'validation_error', 'category');
      }
    }

    if (isActive !== undefined) {
      req.body.isActive = isActive === true || isActive === 'true';
    }

    if (bgColor1 !== undefined && bgColor1 !== null) {
      if (typeof bgColor1 !== 'string') {
          throw new HttpError(400, 'INVALID_BG_COLOR_1', 'validation_error', 'category');
      }

      req.body.bgColor1 = bgColor1.trim();
    }

    if (bgColor2 !== undefined && bgColor2 !== null) {
      if (typeof bgColor2 !== 'string') {
          throw new HttpError(400, 'INVALID_BG_COLOR_2', 'validation_error', 'category');
      }

      req.body.bgColor2 = bgColor2.trim();
    }

    if (gradientText !== undefined && gradientText !== null) {
      if (typeof gradientText !== 'string') {
          throw new HttpError(400, 'INVALID_GRADIENT_TEXT', 'validation_error', 'category');
      }

      req.body.gradientText = gradientText.trim();
    }


    next();
  } catch (error) {
    next(error);
  }
};

export const validateUpdateCategoryPosition = async (req, res, next) => {
  try {
    let { position } = req.body;

    if (position === undefined || position === null) {
      throw new HttpError(400, 'POSITION_REQUIRED', 'position_required', 'category');
    }

    position = Number(position);
    if (!Number.isInteger(position) || position <= 0) {
      throw new HttpError(400, 'INVALID_POSITION', 'invalid_position', 'category');
    }

    req.body.position = position;

    next();
  } catch (error) {
    next(error);
  }
};