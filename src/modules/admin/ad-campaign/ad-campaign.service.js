import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { generateUniqueAlbumSlug } from '../../../common/utils/generateUniqueSlug.js';
import uploadService from '../uploads/upload.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { notificationQueue } from '../../../common/queues/notification.queue.js';
import { deleteFromCDN, deleteFromCDNByUrl, uploadToCDN } from '../../../common/utils/globalUploader.js';
import { extractAudioMetadataFromCDN } from '../../../common/utils/audio-metadata.util.js';

class AdCampaignService {

  async create({ body }) {
    try {
      const campaign = await prisma.adCampaign.create({
        data: {
          name: body.name,
          description: body.description || null,
          campaignType: body.campaign_type,
          userType: body.user_type,

          startDate: body.start_date ? new Date(body.start_date) : null,
          endDate: body.end_date ? new Date(body.end_date) : null,

          priority: body.priority,

          status: body.status || "ACTIVE",

          adsData: body.ads_data
        }
      });

      return [];

    } catch (error) {
      throw error;
    }
  }

  async index(lang, { page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;

    const whereCondition = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
    };

    const adCampaigns = await prisma.adCampaign.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.adCampaign.count({
      where: whereCondition,
    });

    return {
      records: adCampaigns,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async show(id, lang) {
    const adCampaign = await prisma.adCampaign.findFirst({
      where: { id }
    });

    if (!adCampaign) {
      throw new HttpError(404, 'ADCAMPAIGN_NOT_FOUND', 'ad_campaign_not_found', 'ad-campaign');
    }

    return adCampaign;
  }

  async update({ id, body }) {
    try {
      // check existing record
      const adCampaign = await prisma.adCampaign.findFirst({ where: { id } });

      if (!adCampaign) {
        throw new HttpError(404, 'ADCAMPAIGN_NOT_FOUND', 'ad_campaign_not_found', 'ad-campaign');
      }

      // 🧩 Prepare update data (only changed fields)
      const data = {
        ...(body.name && { name: body.name }),

        ...(body.description !== undefined && {
          description: body.description || null,
        }),

        ...(body.campaign_type && {
          campaignType: body.campaign_type,
        }),

        ...(body.user_type && {
          userType: body.user_type,
        }),

        ...(body.start_date && {
          startDate: new Date(body.start_date),
        }),

        ...(body.end_date && {
          endDate: new Date(body.end_date),
        }),

        ...(body.priority && {
          priority: body.priority,
        }),

        ...(body.status && {
          status: body.status,
        }),

        /**
         * 🔥 JSON update (important)
         */
        ...(body.ads_data && {
          adsData: body.ads_data,
        }),
      };

      // update
      await prisma.adCampaign.update({
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
    const adCampaign = await prisma.adCampaign.findFirst({ where: { id } });

    if (!adCampaign) {
      throw new HttpError(404, 'ADCAMPAIGN_NOT_FOUND', 'ad_campaign_not_found', 'ad-campaign');
    }

    await prisma.adCampaign.delete({ where: { id } });

    return true
  }

  async changeStatus(id, status) {
    // check existing record
    const adCampaign = await prisma.adCampaign.findFirst({ where: { id } });

    if (!adCampaign) {
      throw new HttpError(404, 'ADCAMPAIGN_NOT_FOUND', 'ad_campaign_not_found', 'ad-campaign');
    }

    await prisma.adCampaign.update({ where: { id }, data: { status: status } });

    return true
  }
}

export default new AdCampaignService();