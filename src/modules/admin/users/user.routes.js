import { Router } from 'express';
import userController from './user.controller.js';
import { validate } from '../../../common/middlewares/zod.middleware.js';
import {
  CreateUserSchema,
  UpdateUserSchema,
} from './user.validator.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware)


/* ================= ADMIN ================= */
router.post('/',checkPermission('user','create'), uploadMiddleware.single('profileImage'),validate(CreateUserSchema), userController.create);
router.get('/',checkPermission('user','read'), userController.index);
router.get('/:id',checkPermission('user','read'), userController.show);
router.put('/:id',checkPermission('user','update'), uploadMiddleware.single('profileImage'),validate(UpdateUserSchema), userController.update);
router.delete('/:id',checkPermission('user','delete'), userController.remove);


export default router;
