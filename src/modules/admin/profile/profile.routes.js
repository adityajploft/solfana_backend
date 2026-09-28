import { Router } from 'express';
import { validate } from "../../../common/middlewares/zod.middleware.js";
import profileController from "../profile/profile.controller.js";
import { ChangePasswordSchema, UpdateProfileSchema } from "./profile.validator.js";
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= USER ================= */
router.get('/', 
    checkPermission('profile','view'), 
    profileController.getProfile
);

router.patch(
    '/',
    checkPermission('profile','update'),
    uploadMiddleware.single('profileImage'),
    validate(UpdateProfileSchema),
    profileController.updateProfile
);

router.patch('/change-password',
    checkPermission('profile','change_password'),
    validate(ChangePasswordSchema), 
    profileController.changePassword
);

export default router;