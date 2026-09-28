import { Router } from 'express';
import albumController from './album.controller.js';
import {
  validateCreateAlbum,
  validateUpdateAlbum,
} from './album.validator.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN ALBUM ================= */

router.post('/',uploadMiddleware.single("coverImage"),validateCreateAlbum,albumController.create);

router.get('/', albumController.index);
router.get('/slug/:slug', albumController.showBySlug);

/* ================= ADMIN ACTION ALBUM API ================= */

router.get('/publish-requests', albumController.getPublishRequests);

/* SINGLE ACTION */
router.post('/publish-requests/:requestId/action',albumController.publishRequestAction);

/* BULK ACTION */
router.post('/publish-requests/bulk-action',albumController.bulkPublishRequestAction);

router.get('/:id', albumController.show);

router.put('/:id',uploadMiddleware.single('coverImage'),validateUpdateAlbum,albumController.update);

router.delete('/:id', albumController.remove);

/* ================= PODCASTER PUBLISH ALBUM API ================= */

router.post('/:id/publish', albumController.publishAlbum);

router.post('/:id/schedule', albumController.scheduleAlbum);

/* DELETE SCHEDULE */
router.delete('/:id/schedule', albumController.deleteSchedule);




export default router;