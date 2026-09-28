import { Router } from 'express';
import categoryController from './category.controller.js';
import { validate } from '../../../../common/middlewares/zod.middleware.js';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from './category.validator.js';
import { i18nMiddleware } from '../../../../common/middlewares/i18n.middleware.js';
import upload from '../../../../common/utils/globalUploader.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN CATEGORIES ================= */
router.post('/',
  upload.single('image'), 
  validate(CreateCategorySchema), 
  categoryController.create
);
router.get('/', categoryController.index);
router.get('/:id', categoryController.show);
router.put('/:id', validate(UpdateCategorySchema), categoryController.update);
router.delete('/:id', categoryController.remove);


export default router;
