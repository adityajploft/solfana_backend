import axios from "axios";
import fs from 'fs';
import path from 'path';
import sharp from 'sharp'; // Optional: for image optimization before upload
import dotenv from 'dotenv';
dotenv.config();

class BunnyCDNService {
  constructor() {
    this.storageZone = process.env.BUNNY_STORAGE_ZONE;
    this.accessKey = process.env.BUNNY_STORAGE_API_KEY;
    this.cdnUrl = process.env.BUNNY_STORAGE_CDN_URL; // e.g., https://your-cdn.b-cdn.net
    this.storageUrl = process.env.BUNNY_STORAGE_URL || 'https://storage.bunnycdn.com';
    this.region = process.env.BUNNY_REGION || ''; // e.g., 'ny' or 'la' for US regions
  }

  /**
   * Get the storage API URL based on region
   */
  getStorageApiUrl() {
    if (this.region) {
      return `https://${this.region}.storage.bunnycdn.com`;
    }
    return this.storageUrl;
  }

  /**
   * Upload file to BunnyCDN storage
   */
  async uploadFile(filePath, destinationPath, options = {}) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const apiUrl = this.getStorageApiUrl();
      
      // Construct the full destination path
      const fullPath = `${this.storageZone}/${destinationPath}`;
      
      const response = await axios.put(
        `${apiUrl}/${fullPath}`,
        fileBuffer,
        {
          headers: {
            'AccessKey': this.accessKey,
            'Content-Type': options.contentType || 'application/octet-stream',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      if (response.status === 201 || response.status === 200) {
        return {
          success: true,
          cdnUrl: `${this.cdnUrl}/${destinationPath}`,
          storagePath: destinationPath,
        };
      }

      throw new Error(`Upload failed with status: ${response.status}`);
    } catch (error) {
      console.error('BunnyCDN upload error:', error.message);
      throw new Error(`Failed to upload to BunnyCDN: ${error.message}`);
    }
  }

  /**
   * Upload file buffer directly (useful for processed images)
   */
  async uploadBuffer(buffer, destinationPath, contentType) {
    try {
      const apiUrl = this.getStorageApiUrl();
      const fullPath = `${this.storageZone}/${destinationPath}`;
      
      const response = await axios.put(
        `${apiUrl}/${fullPath}`,
        buffer,
        {
          headers: {
            'AccessKey': this.accessKey,
            "Content-Type": "application/octet-stream"
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      if (response.status === 201 || response.status === 200) {
        return {
          success: true,
          cdnUrl: `${this.cdnUrl}/${destinationPath}`,
          storagePath: destinationPath,
        };
      }

      throw new Error(`Upload failed with status: ${response.status}`);
    } catch (error) {
      console.error('BunnyCDN buffer upload error:', error.message);
      throw new Error(`Failed to upload buffer to BunnyCDN: ${error.message}`);
    }
  }

  /**
   * Delete file from BunnyCDN storage
   */
  async deleteFile(storagePath) {
    try {
      const apiUrl = this.getStorageApiUrl();
      const fullPath = `${this.storageZone}/${storagePath}`;
      
      const response = await axios.delete(
        `${apiUrl}/${fullPath}`,
        {
          headers: {
            'AccessKey': this.accessKey,
          },
        }
      );

      return {
        success: response.status === 200 || response.status === 404, // 404 means already deleted
      };
    } catch (error) {
      console.error('BunnyCDN delete error:', error.message);
      // Don't throw error for delete operations, just log
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate optimized image URL with parameters
   */
  getOptimizedImageUrl(storagePath, options = {}) {
    const {
      width,
      height,
      quality = 85,
      format, // 'webp', 'jpg', 'png'
      aspectRatio,
      sharpen,
      blur,
    } = options;

    let url = `${this.cdnUrl}/${storagePath}`;
    const params = [];

    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    if (quality) params.push(`quality=${quality}`);
    if (format) params.push(`format=${format}`);
    if (aspectRatio) params.push(`aspect_ratio=${aspectRatio}`);
    if (sharpen) params.push(`sharpen=${sharpen}`);
    if (blur) params.push(`blur=${blur}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return url;
  }

  /**
   * Generate destination path with organized folder structure
   */
  generateDestinationPath(entityType, uploadType, filename) {
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // Organize by entity type and upload type
    return `${entityType}/${uploadType}/${timestamp}_${sanitizedName}${ext}`;
  }

  /**
   * Optimize image before upload (optional)
   */
  async optimizeImage(filePath, options = {}) {
    try {
      const {
        maxWidth = 2048,
        maxHeight = 2048,
        quality = 85,
      } = options;

      let transformer = sharp(filePath);

      const metadata = await transformer.metadata();

      // Resize if needed
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        transformer = transformer.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Preserve original format
      switch (metadata.format) {
        case 'png':
          transformer = transformer.png({
            compressionLevel: 9,
          });
          break;

        case 'webp':
          transformer = transformer.webp({
            quality,
          });
          break;

        case 'gif':
          // optional: keep gif untouched
          break;

        default:
          transformer = transformer.jpeg({
            quality,
            mozjpeg: true,
          });
      }

      return await transformer.toBuffer();

    } catch (error) {
      console.error('Image optimization error:', error.message);

      return fs.readFileSync(filePath);
    }
  }

  /**
   * Purge CDN cache for a specific file
   */
  async purgeCache(url) {
    try {
      const apiKey = process.env.BUNNY_API_KEY; // Different from storage access key
      
      const response = await axios.post(
        'https://api.bunny.net/purge',
        {
          url: url,
        },
        {
          headers: {
            'AccessKey': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: response.status === 200 };
    } catch (error) {
      console.error('CDN purge error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   *  Delete audio-library folder
   */
  async deletePath(storagePath) {
    try {
      const apiUrl = this.getStorageApiUrl();

      const normalizedPath = storagePath.endsWith('/')
        ? storagePath
        : `${storagePath}/`;

      const fullPath = `${this.storageZone}/${normalizedPath}`;

      const response = await axios.delete(`${apiUrl}/${fullPath}`, {
        headers: {
          AccessKey: this.accessKey,
        },
      });

      return {
        success: [200, 204, 404].includes(response.status),
      };

    } catch (error) {
      console.error('Bunny delete failed:', {
        path: storagePath,
        status: error.response?.status,
        data: error.response?.data,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if BunnyCDN is configured
   */
  isConfigured() {
    return !!(this.storageZone && this.accessKey && this.cdnUrl);
  }

  // upload stream file
  async uploadStream(stream, destinationPath, contentType = "application/octet-stream") {
    try {
      const apiUrl = this.getStorageApiUrl();
      const fullPath = `${this.storageZone}/${destinationPath}`;

      const response = await axios.put(
        `${apiUrl}/${fullPath}`,
        stream, 
        {
          headers: {
            'AccessKey': this.accessKey,
            'Content-Type': contentType,
            'Transfer-Encoding': 'chunked', // ✅ important for streams
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      if (response.status === 201 || response.status === 200) {
        return {
          success: true,
          cdnUrl: `${this.cdnUrl}/${destinationPath}`,
          storagePath: destinationPath,
        };
      }

      throw new Error(`Upload failed with status: ${response.status}`);
    } catch (error) {
      console.error('BunnyCDN stream upload error:', error.message);

      throw new Error(`Failed to upload stream to BunnyCDN: ${error.message}`);
    }
  }

  async getCDNData() {
    try {
      const response = await axios.get(
        "https://api.bunny.net/statistics",
        {
          headers: { AccessKey: process.env.BUNNY_GLOBAL_API_KEY }
        }
      );

      const data = response.data;

      // 🔁 Convert bytes → MB/GB
      const formatBytes = (bytes = 0) => ({
        bytes,
        mb: +(bytes / (1024 * 1024)).toFixed(2),
        gb: +(bytes / (1024 * 1024 * 1024)).toFixed(2)
      });

      // 🔁 Convert chart object values
      const formatChart = (chart = {}) => {
        const formatted = {};
        for (const key in chart) {
          formatted[key] = formatBytes(chart[key]);
        }
        return formatted;
      };

      return {
        summary: {
          totalBandwidth: formatBytes(data.TotalBandwidthUsed),
          totalOriginTraffic: formatBytes(data.TotalOriginTraffic),
          // totalRequests: data.TotalRequestsServed,
          // cacheHitRate: +data.CacheHitRate.toFixed(2),
          // avgOriginResponseTime: data.AverageOriginResponseTime
        },

        /* geoTraffic: Object.fromEntries(
          Object.entries(data.GeoTrafficDistribution || {}).map(
            ([key, value]) => [key, formatBytes(value)]
          )
        ) */
      };
    } catch (error) {
      console.error("CDN stats error:", error.response?.data || error.message);
      return null;
    }
  }
}

export default new BunnyCDNService();
