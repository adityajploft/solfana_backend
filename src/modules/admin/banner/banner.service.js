import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { generateUniqueAlbumSlug } from '../../../common/utils/generateUniqueSlug.js';
import uploadService from '../uploads/upload.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { deleteFromCDN, deleteFromCDNByUrl, uploadToCDN } from '../../../common/utils/globalUploader.js';
import { extractAudioMetadataFromCDN } from '../../../common/utils/audio-metadata.util.js';

class BannerService {

  async create({ body, bannerImage }) {
    try {
      let bannerImageBunnyCdnUrl = "";

      // Check Audio FIle Exists
      if (!bannerImage) {
        throw new HttpError(400, 'BANNER_IMAGE_FILE_REQUIRED', 'banner_image_file_required', "banner");
      }

      // Get Audio Url
      const bannerImageCdnUploadResult = await uploadToCDN(bannerImage, 'BANNER', 'BANNER_IMAGE', { optimize: false, deleteLocal: true });
      if (bannerImageCdnUploadResult.success) {
        bannerImageBunnyCdnUrl = bannerImageCdnUploadResult.cdnUrl.startsWith("http") ? bannerImageCdnUploadResult.cdnUrl : `https://${bannerImageCdnUploadResult.cdnUrl}`;
      } else {
        throw new HttpError(400, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track'); 
      }

      const banner = await prisma.banner.create({
        data: {
          title: body.title,

          bannerImage: bannerImageBunnyCdnUrl,

          bannerType: body.banner_type,

          actionType: body.action_type,
          externalUrl: body.action_type == "EXTERNAL_URL" ? body.external_url : null,
          internalScreen: body.action_type == "INTERNAL_SCREEN" ? body.internal_screen : null,

          userType: body.user_type,

          startDate: body.start_date ? new Date(body.start_date) : null,

          endDate: body.end_date ? new Date(body.end_date) : null,

          displayedDate: body.banner_event_date ? new Date(body.banner_event_date) : null,

          priority: body.priority,

          location: body.location ? body.location : null,

          isActive: body.is_active !== undefined ? body.is_active : true,

          placements: body.placements
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

    const banners = await prisma.banner.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.banner.count({
      where: whereCondition,
    });

    return {
      records: banners,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async show(id, lang) {
    const banner = await prisma.banner.findFirst({
      where: { id }
    });

    if (!banner) {
      throw new HttpError(404, 'BANNER_NOT_FOUND', 'banner_not_found', 'banner');
    }

    return banner;
  }

  async update({ id, body, bannerImage }) {
    try {
      let bannerImageBunnyCdnUrl;

      // check existing record
      const banner = await prisma.banner.findFirst({ where: { id } });

      if (!banner) {
        throw new HttpError(404, 'BANNER_NOT_FOUND', 'banner_not_found', 'banner');
      }

      // Update Audio File (optional)
      if (bannerImage) {
        const bannerImageUpload = await uploadToCDN(bannerImage, "BANNER", "BANNER_IMAGE", { optimize: false, deleteLocal: true });

        if (!bannerImageUpload.success) {
          throw new HttpError(400, "CDN_UPLOAD_FAILED", "cdn_upload_failed", "audio-ad");
        }

        bannerImageBunnyCdnUrl = bannerImageUpload.cdnUrl.startsWith("http") ? bannerImageUpload.cdnUrl : `https://${bannerImageUpload.cdnUrl}`;

        // Remove File from bunnycdn
        if (banner.bannerImage) {
          deleteFromCDNByUrl(banner.bannerImage);
        }
      }

      // 🧩 Prepare update data (only changed fields)
      const data = {
        ...(body.title && { title: body.title }),

        ...(body.banner_type && { bannerType: body.banner_type, }),

        ...(body.action_type && { actionType: body.action_type, }),

        ...(body.external_url !== undefined && { externalUrl: body.action_type == "EXTERNAL_URL" ? body.external_url : null }),

        ...(body.internal_screen !== undefined && { internalScreen: body.action_type == "INTERNAL_SCREEN" ? body.internal_screen : null }),

        ...(body.user_type && { userType: body.user_type }),

        ...(body.start_date && { startDate: new Date(body.start_date) }),

        ...(body.end_date && { endDate: new Date(body.end_date) }),

        ...(body.banner_event_date && { displayedDate: new Date(body.banner_event_date) }),

        ...(body.priority && { priority: body.priority }),
        
        ...(body.location && { location: body.location ? body.location : null }),

        ...(body.is_active !== undefined && { isActive: body.is_active }),

        ...(body.placements && { placements: body.placements }),

        ...(bannerImageBunnyCdnUrl && { bannerImage: bannerImageBunnyCdnUrl }),

        isActive: body.is_active
      };

      // update
      await prisma.banner.update({
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
    const banner = await prisma.banner.findFirst({ where: { id } });

    if (!banner) {
      throw new HttpError(404, 'BANNER_NOT_FOUND', 'banner_not_found', 'banner');
    }

    // Remove Files from bunnycdn
    deleteFromCDNByUrl(banner.bannerImage);


    await prisma.banner.delete({ where: { id } });

    return true
  }

  async changeStatus(id) {
    // check existing record
    const banner = await prisma.banner.findFirst({ where: { id } });

    if (!banner) {
      throw new HttpError(404, 'BANNER_NOT_FOUND', 'banner_not_found', 'banner');
    }

    let status = true;
    if(banner.isActive){ status = false; }
    
    const updated = await prisma.banner.update({
      where: { id },
      data: {
        isActive: status
      }
    });

    return updated
  }
}

export default new BannerService();