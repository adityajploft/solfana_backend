import { Router } from 'express';
import PodcasterController from './podcaster.controller.js';
import { validate } from '../../../common/middlewares/zod.middleware.js';
import {
  validateCreatePodcaster,
  validateUpdatePodcaster,
} from './podcaster.validator.js';

import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN PODCASTERS ================= */
router.post('/',checkPermission('podcaster','create'), uploadMiddleware.single('profileImage'),validateCreatePodcaster, PodcasterController.create);
router.get('/',checkPermission('podcaster','read'), PodcasterController.index);
router.get('/:id',checkPermission('podcaster','read'), PodcasterController.show);
router.put('/:id',checkPermission('podcaster','update'),uploadMiddleware.single('profileImage'), validateUpdatePodcaster, PodcasterController.update);
router.delete('/:id',checkPermission('podcaster','delete'), PodcasterController.remove);

export default router;
