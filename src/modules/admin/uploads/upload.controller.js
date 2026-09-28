import uploadService from './upload.service.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';
import HttpError from '../../../common/errors/http.error.js';

class UploadController {
  /**
   * Upload single file
   * POST /api/upload/single
   */
  async uploadSingle(req, res, next) {
    try {
      const { entityType, entityId, uploadType, alt, description } = req.body;

      if (!req.file) {
        throw new HttpError(400, 'NO_FILE', 'No file provided', 'file');
      }

      // File is automatically uploaded to CDN via uploadService.saveUpload
      const upload = await uploadService.saveUpload({
        file: req.file,
        uploadType: uploadType || 'general',
        entityType: entityType || 'misc',
        entityId: entityId || null,
        alt,
        description,
        optimizeOptions: {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 85,
        },
      });

      // Get image variants if it's an image
      const variants = uploadService.getImageVariants(upload);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          upload,
          variants, // Different sizes for responsive images
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload multiple files
   * POST /api/upload/multiple
   */
  async uploadMultiple(req, res, next) {
    try {
      const { entityType, entityId, uploadType } = req.body;

      if (!req.files || req.files.length === 0) {
        throw new HttpError(400, 'NO_FILES', 'No files provided', 'files');
      }

      // Upload all files to CDN
      const uploads = await uploadService.saveMultipleUploads(
        req.files,
        uploadType || 'general',
        entityType || 'misc',
        entityId || null,
        {
          optimizeOptions: {
            maxWidth: 2048,
            maxHeight: 2048,
            quality: 85,
          },
        }
      );

      res.status(201).json({
        success: true,
        message: 'Files uploaded successfully',
        data: { uploads },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get uploads by entity
   * GET /api/upload/entity/:entityType/:entityId
   */
  async getByEntity(req, res, next) {
    try {
      const { entityType, entityId } = req.params;
      const { uploadType, width, height, quality } = req.query;

      // Get uploads with optional image optimization parameters
      const imageOptions = {};
      if (width) imageOptions.width = parseInt(width);
      if (height) imageOptions.height = parseInt(height);
      if (quality) imageOptions.quality = parseInt(quality);

      const uploads = await uploadService.getUploadsByEntity(
        entityType,
        entityId,
        uploadType || null,
        imageOptions
      );

      res.json({
        success: true,
        data: { uploads },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single upload with variants
   * GET /api/upload/:uploadId
   */
  async getUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const upload = await uploadService.getUpload(uploadId);

      // Get image variants
      const variants = uploadService.getImageVariants(upload);

      res.json({
        success: true,
        data: {
          upload,
          variants,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Replace upload (useful for profile pictures)
   * PUT /api/upload/replace
   */
  async replaceUpload(req, res, next) {
    try {
      const { entityType, entityId, uploadType } = req.body;

      if (!req.file) {
        throw new HttpError(400, 'NO_FILE', 'No file provided', 'file');
      }

      const upload = await uploadService.replaceUpload(
        entityType,
        entityId,
        uploadType,
        req.file,
        {
          optimizeOptions: {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 90,
          },
        }
      );

      const variants = uploadService.getImageVariants(upload);

      res.json({
        success: true,
        message: 'File replaced successfully',
        data: {
          upload,
          variants,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete upload
   * DELETE /api/upload/:uploadId
   */
  async deleteUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      await uploadService.deleteUpload(uploadId);

      res.json({
        success: true,
        message: 'Upload deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upload statistics
   * GET /api/upload/stats/:entityType/:entityId
   */
  async getStats(req, res, next) {
    try {
      const { entityType, entityId } = req.params;
      const stats = await uploadService.getUploadStats(entityType, entityId);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Migrate single upload to CDN
   * POST /api/upload/migrate/:uploadId
   */
  async migrateUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const result = await uploadService.migrateLocalUploadToCDN(uploadId);

      res.json({
        success: true,
        message: result.message,
        data: result.upload,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk migrate uploads to CDN
   * POST /api/upload/migrate/bulk
   */
  async bulkMigrate(req, res, next) {
    try {
      const { limit } = req.body;
      const results = await uploadService.bulkMigrateToCDN(limit || 100);

      res.json({
        success: true,
        message: 'Migration completed',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload profile picture (example of specialized upload)
   * POST /api/upload/profile-picture/:userId
   */
  async uploadProfilePicture(req, res, next) {
    try {
      const { userId } = req.params;

      if (!req.file) {
        throw new HttpError(400, 'NO_FILE', 'No file provided', 'file');
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        throw new HttpError(400, 'INVALID_FILE', 'Only images are allowed', 'file');
      }

      // Replace existing profile picture
      const upload = await uploadService.replaceUpload(
        'user',
        userId,
        'profile_picture',
        req.file,
        {
          optimizeOptions: {
            maxWidth: 500,
            maxHeight: 500,
            quality: 90,
            format: 'jpeg',
          },
        }
      );

      // Get different sizes for different use cases
      const variants = uploadService.getImageVariants(upload);

      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        data: {
          upload,
          variants,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UploadController();