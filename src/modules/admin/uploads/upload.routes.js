// routes/upload.routes.js
import express from 'express';
import uploadController from './upload.controller.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';

const router = express.Router();

// Single file upload
router.post(
  '/single',
  uploadMiddleware.single('file'),
  uploadController.uploadSingle
);

// Multiple files upload
router.post(
  '/multiple',
  uploadMiddleware.multiple('files', 10),
  uploadController.uploadMultiple
);

// Replace upload (e.g., profile picture)
router.put(
  '/replace',
  uploadMiddleware.single('file'),
  uploadController.replaceUpload
);

// Profile picture upload (specialized endpoint)
router.post(
  '/profile-picture/:userId',
  uploadMiddleware.single('file'),
  uploadController.uploadProfilePicture
);

// Get uploads by entity
router.get('/entity/:entityType/:entityId', uploadController.getByEntity);

// Get single upload
router.get('/:uploadId', uploadController.getUpload);

// Delete upload
router.delete('/:uploadId', uploadController.deleteUpload);

// Get upload statistics
router.get('/stats/:entityType/:entityId', uploadController.getStats);

// Migration endpoints
router.post('/migrate/:uploadId', uploadController.migrateUpload);
router.post('/migrate/bulk', uploadController.bulkMigrate);

export default router;