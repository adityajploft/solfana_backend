import prisma from '../../config/db.config.js';
import { deleteFile, deleteFromCDN, uploadToCDN, getOptimizedImageUrl } from '../utils/globalUploader.js';
import HttpError from '../errors/http.error.js';
import path from 'path';

class UploadService {
  /**
   * Save upload record to database with CDN support
   */
  async saveUpload(data) {
    const {
      file,
      uploadType,
      entityType,
      entityId,
      cdnUrl = null,
      storagePath = null,
      alt = null,
      description = null,
      optimizeOptions = {},
    } = data;

    // Upload to CDN if configured
    let cdnData = { cdnUrl, storagePath };
    
    if (!cdnUrl && !storagePath) {
      const cdnUploadResult = await uploadToCDN(
        file,
        entityType,
        uploadType,
        {
          optimize: file.mimetype.startsWith('image/'),
          optimizeOptions,
          deleteLocal: true, // Delete local file after CDN upload
        }
      );

      if (cdnUploadResult.success) {
        cdnData = {
          cdnUrl: cdnUploadResult.cdnUrl,
          storagePath: cdnUploadResult.storagePath,
        };
      } else {
        throw new HttpError(
          400,
          'CDN_UPLOAD_FAILED',
          'cdn_upload_failed',
          'track'
        );
      }
    }

    const bunnyCdnUrl = cdnData.cdnUrl.startsWith("http") ? cdnData.cdnUrl : `https://${cdnData.cdnUrl}`;

    const upload = await prisma.upload.create({
      data: {
        filename: cdnData.storagePath 
          ? path.basename(cdnData.storagePath) 
          : file.filename || file.originalname,
        originalName: file.originalname,
        filepath: cdnData.storagePath || file.path || null, // Use CDN path if available; memory uploads have no path
        mimetype: file.mimetype,
        size: file.size,
        uploadType,
        entityType,
        entityId,
        cdnUrl: bunnyCdnUrl,
        storagePath: cdnData.storagePath,
        alt,
        description,
      },
    });

    return upload;
  }

  /**
   * Save multiple uploads with CDN support
   */
  async saveMultipleUploads(files, uploadType, entityType, entityId, options = {}) {
    const uploadPromises = files.map(async (file) => {
      // Upload each file to CDN
      const cdnUploadResult = await uploadToCDN(
        file,
        entityType,
        uploadType,
        {
          optimize: file.mimetype.startsWith('image/'),
          optimizeOptions: options.optimizeOptions || {},
          deleteLocal: true,
        }
      );

      const bunnyCdnUrl = cdnUploadResult.cdnUrl.startsWith("http") ? cdnUploadResult.cdnUrl : `https://${cdnUploadResult.cdnUrl}`;

      return {
        filename: cdnUploadResult.storagePath 
          ? path.basename(cdnUploadResult.storagePath) 
          : file.filename || file.originalname,
        originalName: file.originalname,
        filepath: cdnUploadResult.storagePath || file.path || null,
        mimetype: file.mimetype,
        size: file.size,
        uploadType,
        entityType,
        entityId,
        cdnUrl: bunnyCdnUrl,
        storagePath: cdnUploadResult.storagePath,
      };
    });

    const uploadsData = await Promise.all(uploadPromises);

    const uploads = await prisma.upload.createMany({
      data: uploadsData,
    });

    return uploads;
  }

  /**
   * Get uploads by entity with optimized URLs
   */
  async getUploadsByEntity(entityType, entityId, uploadType = null, imageOptions = {}) {
    const where = {
      entityType,
      entityId,
      deletedAt: null,
      isActive: true,
    };

    if (uploadType) {
      where.uploadType = uploadType;
    }

    const uploads = await prisma.upload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Add optimized URLs for images if requested
    if (imageOptions && Object.keys(imageOptions).length > 0) {
      return uploads.map(upload => {
        if (upload.mimetype.startsWith('image/') && upload.storagePath) {
          return {
            ...upload,
            optimizedUrl: getOptimizedImageUrl(upload.storagePath, imageOptions),
          };
        }
        return upload;
      });
    }

    return uploads;
  }

  /**
   * Get single upload by ID with optional optimization
   */
  async getUpload(uploadId, imageOptions = {}) {
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      throw new HttpError(404, 'UPLOAD_NOT_FOUND', 'upload_not_found', 'upload');
    }

    // Add optimized URL for images if requested
    if (
      imageOptions &&
      Object.keys(imageOptions).length > 0 &&
      upload.mimetype.startsWith('image/') &&
      upload.storagePath
    ) {
      upload.optimizedUrl = getOptimizedImageUrl(upload.storagePath, imageOptions);
    }

    return upload;
  }

  /**
   * Delete upload (soft delete + file removal from both local and CDN)
   */
  async deleteUpload(uploadId) {
    const upload = await this.getUpload(uploadId);

    // Delete from CDN if exists
    if (upload.storagePath) {
      await deleteFromCDN(upload.storagePath);
    }

    // Delete local physical file if exists
    if (upload.filepath) {
      deleteFile(upload.filepath);
    }

    // Soft delete in database
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { success: true };
  }

  /**
   * Delete old upload when replacing (e.g., profile image)
   */
  async replaceUpload(entityType, entityId, uploadType, newFile, options = {}) {
    // Find existing upload
    const existingUpload = await prisma.upload.findFirst({
      where: {
        entityType,
        entityId,
        uploadType,
        deletedAt: null,
      },
    });

    // Delete old file if exists
    if (existingUpload) {
      await this.deleteUpload(existingUpload.id);
    }

    // Save new upload with CDN
    return this.saveUpload({
      file: newFile,
      uploadType,
      entityType,
      entityId,
      optimizeOptions: options.optimizeOptions || {},
    });
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(entityType, entityId) {
    const stats = await prisma.upload.aggregate({
      where: {
        entityType,
        entityId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        size: true,
      },
    });

    return {
      totalFiles: stats._count,
      totalSize: stats._sum.size || 0,
      totalSizeMB: ((stats._sum.size || 0) / (1024 * 1024)).toFixed(2),
    };
  }

  /**
   * Cleanup orphaned files (files in DB but not on disk)
   */
  async cleanupOrphanedFiles() {
    const uploads = await prisma.upload.findMany({
      where: { deletedAt: null },
    });

    const fs = require('fs');
    let cleaned = 0;

    for (const upload of uploads) {
      // Check local file only if no CDN path (legacy uploads)
      if (!upload.storagePath && upload.filepath && !fs.existsSync(upload.filepath)) {
        await prisma.upload.update({
          where: { id: upload.id },
          data: { deletedAt: new Date(), isActive: false },
        });
        cleaned++;
      }
    }

    return { cleaned };
  }

  /**
   * Get different sizes of an image (thumbnail, medium, large)
   */
  getImageVariants(upload) {
    if (!upload.storagePath || !upload.mimetype.startsWith('image/')) {
      return null;
    }

    return {
      original: upload.cdnUrl,
      thumbnail: getOptimizedImageUrl(upload.storagePath, {
        width: 150,
        height: 150,
        quality: 80,
      }),
      small: getOptimizedImageUrl(upload.storagePath, {
        width: 400,
        quality: 85,
      }),
      medium: getOptimizedImageUrl(upload.storagePath, {
        width: 800,
        quality: 85,
      }),
      large: getOptimizedImageUrl(upload.storagePath, {
        width: 1200,
        quality: 85,
      }),
      webp: getOptimizedImageUrl(upload.storagePath, {
        width: 800,
        quality: 85,
        format: 'webp',
      }),
    };
  }

  /**
   * Migrate existing local uploads to CDN
   */
  async migrateLocalUploadToCDN(uploadId) {
    const upload = await this.getUpload(uploadId);

    // Skip if already on CDN
    if (upload.storagePath) {
      return { success: true, message: 'Already on CDN' };
    }

    // Check if local file exists
    const fs = require('fs');
    if (!fs.existsSync(upload.filepath)) {
      throw new HttpError(404, 'LOCAL_FILE_NOT_FOUND', 'Local file not found', 'upload');
    }

    // Upload to CDN
    const cdnUploadResult = await uploadToCDN(
      {
        path: upload.filepath,
        originalname: upload.originalName,
        mimetype: upload.mimetype,
        filename: upload.filename,
        size: upload.size,
      },
      upload.entityType,
      upload.uploadType,
      {
        optimize: upload.mimetype.startsWith('image/'),
        deleteLocal: false, // Keep local as backup during migration
      }
    );

    if (!cdnUploadResult.success) {
      throw new HttpError(500, 'CDN_UPLOAD_FAILED', 'Failed to upload to CDN', 'upload');
    }

    // Update database with CDN info
    const updatedUpload = await prisma.upload.update({
      where: { id: uploadId },
      data: {
        cdnUrl: cdnUploadResult.cdnUrl,
        storagePath: cdnUploadResult.storagePath,
      },
    });

    return {
      success: true,
      upload: updatedUpload,
      message: 'Successfully migrated to CDN',
    };
  }

  /**
   * Bulk migrate all local uploads to CDN
   */
  async bulkMigrateToCDN(limit = 100) {
    const localUploads = await prisma.upload.findMany({
      where: {
        storagePath: null,
        deletedAt: null,
      },
      take: limit,
    });

    const results = {
      total: localUploads.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const upload of localUploads) {
      try {
        await this.migrateLocalUploadToCDN(upload.id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          uploadId: upload.id,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new UploadService();