import { Router } from 'express';
import controller from './level-category.controller.js';
import { validateCreateLevelCategory, validateUpdateLevelCategory, validateUpdateCategoryPosition } from './level-category.validator.js';
import upload from '../../../../common/utils/globalUploader.js';
import checkPermission from '../../../../common/middlewares/permissions.middleware.js';

const router = Router();

router.get('/', checkPermission('category','read'), controller.index);

router.post('/', checkPermission('category','create'), upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'featuredImage', maxCount: 1 },
    ]), validateCreateLevelCategory, controller.create);

router.get('/:id', checkPermission('category', 'read'), controller.show);

router.put('/:id', checkPermission('category','update'), upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'featuredImage', maxCount: 1 },
    ]), validateUpdateLevelCategory, controller.update);

router.delete('/:id', checkPermission('category','delete'), controller.remove);

router.patch('/:id/position', checkPermission('category', 'update'), validateUpdateCategoryPosition, controller.updatePosition);

export default router;
