import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';

const validateRootCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      throw new HttpError(400, 'CATEGORY_ID_REQUIRED', 'category_id_required', 'category');
    }

    // Check category exists AND is root category
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        parentId: null,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    if (!category) {
      throw new HttpError(
        400,
        'INVALID_CATEGORY',
        'invalid_category',
        'category'
      );
    }

    // attach validated category for later use (optional but useful)
    req.rootCategory = category;

    next();
  } catch (error) {
    next(error);
  }
};

export default validateRootCategory;