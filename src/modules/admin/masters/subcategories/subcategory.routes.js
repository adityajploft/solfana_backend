import { Router } from 'express';
import subCategoryController from './subcategory.controller.js';
import { validate } from '../../../../common/middlewares/zod.middleware.js';
import {
  CreateSubCategorySchema,
  UpdateSubCategorySchema,
} from './subcategory.validator.js';
import { i18nMiddleware } from '../../../../common/middlewares/i18n.middleware.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN CATEGORIES ================= */
router.post('/', validate(CreateSubCategorySchema), subCategoryController.create);
router.get('/', subCategoryController.index);
router.get('/:id', subCategoryController.show);
router.put('/:id', validate(UpdateSubCategorySchema), subCategoryController.update);
router.delete('/:id', subCategoryController.remove);

export default router;
