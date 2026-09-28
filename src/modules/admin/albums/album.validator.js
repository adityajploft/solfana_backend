import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';

/**
 * Validate Create Album
 */
export const validateCreateAlbum = async (req, res, next) => {
  try {
    let { categoryIds, podcasterId, status, title, description, metaKeywords, isExplicit } = req.body;

    // CATEGORY IDS
    if (typeof categoryIds === 'string') {
      try {
        categoryIds = JSON.parse(categoryIds);
      } catch {
        categoryIds = [categoryIds];
      }
    }

    if (!Array.isArray(categoryIds) || categoryIds.length < 1) {
      throw new HttpError(400, 'CATEGORY_REQUIRED', 'validation_error', 'album');
    }

    // Validate UUID format before querying DB
    categoryIds.forEach(id => {
      if (typeof id !== 'string' || !isUUID(id)) {
        throw new HttpError(400, 'INVALID_CATEGORY_ID', 'validation_error', 'album');
      }
    });

    // Check categories exist
    const existingCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        deletedAt: null
      },
      select: { id: true }
    });

    if (existingCategories.length !== categoryIds.length) {
      throw new HttpError(400, 'CATEGORY_NOT_FOUND', 'validation_error', 'album');
    }

    req.body.categoryIds = categoryIds;

    // TYPE
    if (!req.body.type) {
      throw new HttpError(400, 'TYPE_REQUIRED', 'validation_error', 'album');
    }

    if (!['PODCAST', 'AUDIOBOOK'].includes(req.body.type)) {
      throw new HttpError(400, 'INVALID_TYPE', 'validation_error', 'album');
    }

    // PODCASTER
    if (!podcasterId || !isUUID(podcasterId)) {
      throw new HttpError(400, 'INVALID_PODCASTER_ID', 'validation_error', 'album');
    }

    // TITLE
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      throw new HttpError(400, 'TITLE_REQUIRED', 'validation_error', 'album');
    }

    req.body.title = title.trim();

    // DESCRIPTION
    if (!description || typeof description !== 'string' || description.trim().length < 1) {
      throw new HttpError(400, 'DESCRIPTION_REQUIRED', 'validation_error', 'album');
    }

    req.body.description = description.trim();

    if (metaKeywords !== undefined && metaKeywords !== null) {
      if (typeof metaKeywords !== 'string') {
        throw new HttpError(400, 'INVALID_META_KEYWORDS', 'validation_error', 'album');
      }

      req.body.metaKeywords = metaKeywords.trim();
    }

    // STATUS
    if (status !== undefined) {
      if (!['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED'].includes(status)) {
        throw new HttpError(400, 'INVALID_STATUS', 'validation_error', 'album');
      }
    }

    if (isExplicit !== undefined) {
      if (typeof isExplicit === 'string') {
        if (!['true', 'false'].includes(isExplicit.toLowerCase())) {
          throw new HttpError(400, 'INVALID_EXPLICIT_CONTENT', 'validation_error', 'album');
        }

        req.body.isExplicit = isExplicit.toLowerCase() === 'true';
      } else if (typeof isExplicit === 'boolean') {
        req.body.isExplicit = isExplicit;
      } else {
        throw new HttpError(400, 'INVALID_EXPLICIT_CONTENT', 'validation_error', 'album');
      }
    } else {
      req.body.isExplicit = false;
    }

    next();
  } catch (error) {
    next(error);
  }
};


/**
 * Validate Update Album
 */
export const validateUpdateAlbum = async (req, res, next) => {
  try {
    let { categoryIds, podcasterId, status, title, description, metaKeywords, isExplicit } = req.body;

    // CHECK UPDATE DATA
    if (Object.keys(req.body).length === 0) {
      throw new HttpError(400, 'UPDATE_DATA_REQUIRED', 'validation_error', 'album');
    }

    // CATEGORY IDS
    if (categoryIds !== undefined) {
      if (typeof categoryIds === 'string') {
        try {
          categoryIds = JSON.parse(categoryIds);
        } catch {
          categoryIds = [categoryIds];
        }
      }

      if (!Array.isArray(categoryIds) || categoryIds.length < 1) {
        throw new HttpError(400, 'INVALID_CATEGORY', 'validation_error', 'album');
      }

      categoryIds.forEach(id => {
        if (typeof id !== 'string' || !isUUID(id)) {
          throw new HttpError(400, 'INVALID_CATEGORY_ID', 'validation_error', 'album');
        }
      });

      // Check categories exist
      const existingCategories = await prisma.category.findMany({
        where: {
          id: {
            in: categoryIds
          },
          deletedAt: null
        },
        select: { id: true }
      });

      if (existingCategories.length !== categoryIds.length) {
        throw new HttpError(400, 'CATEGORY_NOT_FOUND', 'validation_error', 'album');
      }

      req.body.categoryIds = categoryIds;
    }

    // PODCASTER
    if (podcasterId !== undefined) {
      if (!isUUID(podcasterId)) {
        throw new HttpError(400, 'INVALID_PODCASTER_ID', 'validation_error', 'album');
      }
    }

    // TITLE
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 1) {
        throw new HttpError(400, 'INVALID_TITLE', 'validation_error', 'album');
      }

      req.body.title = title.trim();
    }

    // DESCRIPTION
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 1) {
        throw new HttpError(400, 'INVALID_DESCRIPTION', 'validation_error', 'album');
      }

      req.body.description = description.trim();
    }

    // META KEYWORDS
    if (metaKeywords !== undefined && metaKeywords !== null) {
      if (typeof metaKeywords !== 'string') {
        throw new HttpError(400, 'INVALID_META_KEYWORDS', 'validation_error', 'album');
      }

      req.body.metaKeywords = metaKeywords.trim();
    }

    // STATUS
    if (status !== undefined) {
      if (!['DRAFT','PENDING_APPROVAL','SCHEDULED','PUBLISHED','REJECTED'].includes(status)) {
        throw new HttpError(400, 'INVALID_STATUS', 'validation_error', 'album');
      }
    }

    // EXPLICIT CONTENT
    if (isExplicit !== undefined) {
      if (typeof isExplicit === 'string') {
        if (!['true', 'false'].includes(isExplicit.toLowerCase())) {
          throw new HttpError(400, 'INVALID_EXPLICIT_CONTENT', 'validation_error', 'album');
        }

        req.body.isExplicit = isExplicit.toLowerCase() === 'true';
      } else if (typeof isExplicit === 'boolean') {
        req.body.isExplicit = isExplicit;
      } else {
        throw new HttpError(400, 'INVALID_EXPLICIT_CONTENT', 'validation_error', 'album');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};


/* ================= HELPER ================= */

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}