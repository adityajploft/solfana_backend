import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bunnyCDNService from '../services/bunnycdn.service.js';
import dotenv from 'dotenv';
dotenv.config();

// NOTE: We're using multer memoryStorage so files are not persisted locally.
// The old uploads directory is no longer needed but kept for backward
// compatibility if disk storage were ever re-enabled.
const uploadsDir = 'uploads';
// directory creation is intentionally no-op when using memory storage.
// Multer storage configuration - use memory storage so we never write files locally
const storage = multer.memoryStorage();

// Note: when using memoryStorage, uploaded files arrive in `file.buffer` and
// `file.originalname`/`file.mimetype`/`file.size` etc.; `file.path` will be
// undefined.

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// Base multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB default
  },
});

/**
 * Upload file to BunnyCDN after multer processes it
 */
export async function uploadToCDN(file, entityType, uploadType, options = {}) {
  if (!bunnyCDNService.isConfigured()) {
    console.warn('BunnyCDN not configured, skipping CDN upload');
    return {
      success: false,
      cdnUrl: null,
      storagePath: null,
      localPath: file.path,
    };
  }

  try {
    const destinationPath = bunnyCDNService.generateDestinationPath(
      entityType,
      uploadType,
      file.originalname
    );

    let uploadResult;

    // helper: determine source
    const hasBuffer = file.buffer && file.buffer instanceof Buffer;

    // Check if image and optimization is requested
    if (file.mimetype.startsWith('image/') && options.optimize) {
      let optimizedBuffer;
      if (hasBuffer) {
        optimizedBuffer = await bunnyCDNService.optimizeImage(
          file.buffer,
          options.optimizeOptions || {}
        );
      } else {
        optimizedBuffer = await bunnyCDNService.optimizeImage(
          file.path,
          options.optimizeOptions || {}
        );
      }

      uploadResult = await bunnyCDNService.uploadBuffer(
        optimizedBuffer,
        destinationPath,
        file.mimetype
      );
    } else {
      if (hasBuffer) {
        uploadResult = await bunnyCDNService.uploadBuffer(
          file.buffer,
          destinationPath,
          file.mimetype
        );
      } else {
        uploadResult = await bunnyCDNService.uploadFile(
          file.path,
          destinationPath,
          { contentType: file.mimetype }
        );
      }
    }

    // Delete local file after successful CDN upload (optional)
    if (uploadResult.success && options.deleteLocal !== false && file.path) {
      deleteFile(file.path);
    }

    return {
      success: true,
      cdnUrl: uploadResult.cdnUrl,
      storagePath: uploadResult.storagePath,
      localPath: options.deleteLocal !== false ? null : file.path || null,
    };
  } catch (error) {
    console.error('CDN upload failed:', error.message);
    
    // Keep local file as fallback
    return {
      success: false,
      error: error.message,
      cdnUrl: null,
      storagePath: null,
      localPath: file.path,
    };
  }
}

/**
 * Upload multiple files to CDN
 */
export async function uploadMultipleToCDN(files, entityType, uploadType, options = {}) {
  const results = await Promise.all(
    files.map(file => uploadToCDN(file, entityType, uploadType, options))
  );

  return results;
}

/**
 * Delete file from local storage
 */
export function deleteFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error.message);
    return false;
  }
}

/**
 * Delete file from CDN
 */
export async function deleteFromCDN(storagePath) {
  if (!bunnyCDNService.isConfigured()) {
    return { success: false, error: 'BunnyCDN not configured' };
  }

  try {
    return await bunnyCDNService.deleteFile(storagePath);
  } catch (error) {
    console.error('CDN delete failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get optimized image URL
 */
export function getOptimizedImageUrl(storagePath, options = {}) {
  if (!bunnyCDNService.isConfigured() || !storagePath) {
    return null;
  }

  return bunnyCDNService.getOptimizedImageUrl(storagePath, options);
}

// Export multer middleware
export const uploadMiddleware = {
  single: (fieldName) => upload.single(fieldName),
  multiple: (fieldName, maxCount = 10) => upload.array(fieldName, maxCount),
  fields: (fields) => upload.fields(fields),
};

// Export configurations
export const uploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export async function deleteFromCDNByUrl(cdnUrl) {
  if (!bunnyCDNService.isConfigured()) {
    return { success: false, error: 'BunnyCDN not configured' };
  }

  try {
    const cdnPath = cdnUrl.replace(`${process.env.BUNNY_STORAGE_URL}/`, "");

    return await bunnyCDNService.deleteFile(cdnPath);
  } catch (error) {
    console.error('CDN delete failed:', error.message);
    return { success: false, error: error.message };
  }
}

export default upload;