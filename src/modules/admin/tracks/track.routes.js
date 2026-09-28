import { Router } from 'express';
import trackController from './track.controller.js';
import { validate } from '../../../common/middlewares/zod.middleware.js';
import { CreateTrackSchema, UpdateTrackSchema } from './track.validator.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import upload from '../../../common/utils/globalUploader.js';

const router = Router();
router.use(i18nMiddleware);

// helper to auto-set uploadType when client omitted it
function inferUploadType(req, res, next) {
  if (!req.body.uploadType) {
    if (req.files && (req.files.audio?.length || req.files.file?.length)) {
      req.body.uploadType = 'simple_upload';
    } else {
      req.body.uploadType = 'library_upload';
    }
  }
  next();
}

// accept either 'audio' or 'file' field to support library and simple uploads, also accept 'coverImage'
router.post(
  '/',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  inferUploadType,
  validate(CreateTrackSchema),
  trackController.create
);
router.get('/:albumId', trackController.index);
router.get('/detail/:id', trackController.show);
router.put(
  '/:id',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
  ]),
  validate(UpdateTrackSchema),
  trackController.update
);
router.delete('/:id', trackController.remove);

/* ================= CREATOR PUBLISH TRACK API ================= */
// router.get('/publish-requests', trackController.getPublishRequests);

router.post('/:id/publish', trackController.publishTrack);

router.post('/:id/schedule', trackController.scheduleTrack);

/* DELETE SCHEDULE */
router.delete('/:id/schedule', trackController.deleteSchedule);

export default router;