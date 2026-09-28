import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { generateUniqueAlbumSlug } from '../../../common/utils/generateUniqueSlug.js';
import uploadService from '../uploads/upload.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { deleteFromCDN, deleteFromCDNByUrl, uploadToCDN } from '../../../common/utils/globalUploader.js';
import { extractAudioMetadataFromCDN } from '../../../common/utils/audio-metadata.util.js';

class AudioAdService {

  async create({ body, files }) {
    try {
      let thumbnailBunnyCdnUrl = "";
      let audioFileBunnyCdnUrl = "";

      // Check Audio FIle Exists
      if (!files?.audio_file || !files.audio_file[0]) {
        throw new HttpError(400, 'AUDIO_FILE_REQUIRED', 'audio_file_required', "audio-ad");
      }

      // Get Thumbnail Url
      if (files?.thumbnail && files.thumbnail[0]) {
        const thumbnail = files.thumbnail[0];
        const thumbnailCdnUploadResult = await uploadToCDN(thumbnail, 'AUDIO_AD', 'THUMBNAIL', { optimize: false, deleteLocal: true });
  
        if (thumbnailCdnUploadResult.success) {
          thumbnailBunnyCdnUrl = thumbnailCdnUploadResult.cdnUrl.startsWith("http") ? thumbnailCdnUploadResult.cdnUrl : `https://${thumbnailCdnUploadResult.cdnUrl}`;
        }
      }

      // Get Audio Url
      const audioFile = files.audio_file[0];
      const audioFileCdnUploadResult = await uploadToCDN(audioFile, 'AUDIO_AD', 'AUDIO_URL', { optimize: false, deleteLocal: true });
      if (audioFileCdnUploadResult.success) {
        audioFileBunnyCdnUrl = audioFileCdnUploadResult.cdnUrl.startsWith("http") ? audioFileCdnUploadResult.cdnUrl : `https://${audioFileCdnUploadResult.cdnUrl}`;
      } else {
        throw new HttpError(400, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track'); 
      }

      // Get Audio Metadata
      const auioUrlMetaData = await extractAudioMetadataFromCDN(audioFileBunnyCdnUrl);

      // Create Audio Ad
      const audioAd = await prisma.audioAd.create({
        data: {
          title: body.title,
          description: body.description || null,
          placements: body.placements,
          skipEnabled: body.skip_enabled,
          skipAfterSec: body.skip_after_sec,
          userType: body.user_type,
          startDate: body.start_date ? new Date(body.start_date) : null,
          endDate: body.end_date ? new Date(body.end_date) : null,
          priority: body.priority,

          audioUrl: audioFileBunnyCdnUrl,
          thumbnail: thumbnailBunnyCdnUrl || null,
          audioMetadata: auioUrlMetaData
        }
      });

      return true;

    } catch (error) {
      throw error;
    }
  }

  async index(lang, { page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;

    const whereCondition = {
        title: {
          contains: search,
          mode: 'insensitive',
        },
    };

    const audioAds = await prisma.audioAd.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.audioAd.count({
      where: whereCondition,
    });

    return {
      records: audioAds,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async show(id, lang) {
    const audioAd = await prisma.audioAd.findFirst({
      where: { id }
    });

    if (!audioAd) {
      throw new HttpError(404, 'AUDIOAD_NOT_FOUND', 'audio_ad_not_found', 'audio-ad');
    }

    return audioAd;
  }

  async update({ id, body, files }) {
    try {
      let thumbnailBunnyCdnUrl;
      let audioFileBunnyCdnUrl;
      let audioMetadata;

      // check existing record
      const audioAd = await prisma.audioAd.findFirst({ where: { id } });

      if (!audioAd) {
        throw new HttpError(404, 'AUDIOAD_NOT_FOUND', 'audio_ad_not_found', 'audio-ad');
      }

      // Update Audio File (optional)
      if (files?.audio_file && files.audio_file[0]) {
        const audioFile = files.audio_file[0];

        const audioUpload = await uploadToCDN(
          audioFile,
          "AUDIO_AD",
          "AUDIO_URL",
          { optimize: false, deleteLocal: true }
        );

        if (!audioUpload.success) {
          throw new HttpError(400, "CDN_UPLOAD_FAILED", "cdn_upload_failed", "audio-ad");
        }

        audioFileBunnyCdnUrl = audioUpload.cdnUrl.startsWith("http") ? audioUpload.cdnUrl : `https://${audioUpload.cdnUrl}`;

        // fetch metadata only if audio updated
        audioMetadata = await extractAudioMetadataFromCDN(audioFileBunnyCdnUrl);

        // Remove File from bunnycdn
        if (audioAd.audioUrl) {
          deleteFromCDNByUrl(audioAd.audioUrl);
        }
      }

      // Update Thumbnail (optional)
      if (files?.thumbnail && files.thumbnail[0]) {
        const thumbnail = files.thumbnail[0];

        const thumbnailUpload = await uploadToCDN(thumbnail, "AUDIO_AD", "THUMBNAIL", { optimize: false, deleteLocal: true });

        if (thumbnailUpload.success) {
          thumbnailBunnyCdnUrl = thumbnailUpload.cdnUrl.startsWith("http") ? thumbnailUpload.cdnUrl : `https://${thumbnailUpload.cdnUrl}`;

          // Remove File from bunnycdn
          if (audioAd.thumbnail) {
            deleteFromCDNByUrl(audioAd.thumbnail);
          }
        }
      }

      // 🧩 Prepare update data (only changed fields)
      const data = {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description || null,
        }),
        ...(body.placements && { placements: body.placements }),
        ...(body.skip_enabled !== undefined && {
          skipEnabled: body.skip_enabled,
        }),
        ...(body.skip_after_sec !== undefined && {
          skipAfterSec: body.skip_after_sec,
        }),
        ...(body.user_type && { userType: body.user_type }),
        ...(body.start_date && {
          startDate: new Date(body.start_date),
        }),
        ...(body.end_date && {
          endDate: new Date(body.end_date),
        }),
        ...(body.priority && { priority: body.priority }),

        isActive: body.is_active,

        // file updates
        ...(audioFileBunnyCdnUrl && { audioUrl: audioFileBunnyCdnUrl }),
        ...(thumbnailBunnyCdnUrl && { thumbnail: thumbnailBunnyCdnUrl }),
        ...(audioMetadata && { audioMetadata }),
      };

      // update
      await prisma.audioAd.update({
        where: { id },
        data,
      });

      return true;

    } catch (error) {
      throw error;
    }
  }

  async remove(id) {
    // check existing record
    const audioAd = await prisma.audioAd.findFirst({ where: { id } });

    if (!audioAd) {
      throw new HttpError(404, 'AUDIOAD_NOT_FOUND', 'audio_ad_not_found', 'audio-ad');
    }

    // Remove Files from bunnycdn
    deleteFromCDNByUrl(audioAd.audioUrl);
    deleteFromCDNByUrl(audioAd.thumbnail);


    await prisma.audioAd.delete({
      where: { id }
    });

    return true
  }

  async changeStatus(id) {
    // check existing record
    const audioAd = await prisma.audioAd.findFirst({ where: { id } });

    if (!audioAd) {
      throw new HttpError(404, 'AUDIOAD_NOT_FOUND', 'audio_ad_not_found', 'audio-ad');
    }

    let status = true;
    if(audioAd.isActive){
      status = false;
    }

    
    const updated = await prisma.audioAd.update({
      where: { id },
      data: {
        isActive: status
      }
    });

    return updated
  }
}

export default new AudioAdService();