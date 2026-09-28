import { Router } from 'express';
import roleController from './role.controller.js';
import { validate } from '../../../common/middlewares/zod.middleware.js';
import {
  CreateRoleSchema,
  UpdateRoleSchema,
} from './role.validator.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware)

router.get('/', checkPermission('role','read'), roleController.index);
router.get('/:id', checkPermission('role','read'), roleController.show);
router.post('/', validate(CreateRoleSchema),checkPermission('role','create'), roleController.create);
router.put('/:id', validate(UpdateRoleSchema), checkPermission('role','update'), roleController.update);
router.delete('/:id', checkPermission('role','delete'), roleController.remove);

export default router;
