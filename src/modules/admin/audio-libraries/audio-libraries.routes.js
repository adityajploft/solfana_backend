import { Router } from 'express';
import AudioLibraryController from './audio-libraries.controller.js';
import { validate } from '../../../common/middlewares/zod.middleware.js';
import {
  CreateAudioLibrarySchema
} from './audio-libraries.validator.js';

import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import upload from '../../../common/utils/globalUploader.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();
router.use(i18nMiddleware);

/* ================= ADMIN Audio Library ================= */
router.get("/", checkPermission('audioLibrary','read'), AudioLibraryController.index);
// router.post("/store", checkPermission('audioLibrary','create'), upload.array("audios", 20),validate(CreateAudioLibrarySchema), AudioLibraryController.create);
router.get("/:id", checkPermission('audioLibrary','read'), AudioLibraryController.show);
router.delete("/:id", checkPermission('audioLibrary','delete'), AudioLibraryController.delete);


router.all(/^\/stores\/?.*/, AudioLibraryController.create);

export default router;