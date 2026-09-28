import { Router } from 'express';
import AudioAdController from './audio-ad.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import upload from '../../../common/utils/globalUploader.js';

const router = Router();
router.use(i18nMiddleware);


router.post('/', upload.fields([{ name: 'audio_file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 },]), AudioAdController.create);

router.get('/', AudioAdController.index);

router.get('/:id', AudioAdController.show);

router.put('/:id', upload.fields([ { name: 'audio_file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 },]), AudioAdController.update);

router.delete('/:id', AudioAdController.remove);

router.patch('/:id/toggle-status', AudioAdController.changeStatus);

export default router;