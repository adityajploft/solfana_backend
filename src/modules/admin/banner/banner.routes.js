import { Router } from 'express';
import bannerController from './banner.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import upload from '../../../common/utils/globalUploader.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';

const router = Router();
router.use(i18nMiddleware);


router.post('/', uploadMiddleware.single("banner_image"), bannerController.create);

router.get('/', bannerController.index);

router.get('/:id', bannerController.show);

router.put('/:id', uploadMiddleware.single("banner_image"), bannerController.update);

router.delete('/:id', bannerController.remove);

router.patch('/:id/toggle-status', bannerController.changeStatus);

export default router;