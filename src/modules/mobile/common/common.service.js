import prisma from '../../../config/db.config.js';
import emailService from '../../../common/services/email.service.js';
import { checkPremiumSubscription } from '../../../common/utils/helper.js';


class commonService {
  async getGoogleAdmobSettings() {
    const settings = await prisma.setting.findMany({
      where: { group: 'google-admob', status: true },
      select: { key: true, value: true, type: true }
    });

    const response = {
      admob_enabled: true,
      admob_user_targeting: "FREE_USERS_ONLY",
    };

    for (const s of settings) {
      let parsedValue = s.value;
      if (s.type === 'boolean') {
        parsedValue = s.value === 'true';
      }

      response[s.key] = parsedValue || null;
    }

    return response;
  }

  async getInternalAudioAds(customerId) {
    const now = new Date();

    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    const isPremiumUser = await checkPremiumSubscription(customerId);

    const allowedUserTypes = isPremiumUser ? ["ALL", "PREMIUM_USER"] : ["ALL", "FREE_USER"];

    // Common Date Filter
    const activeDateFilter = { 
      AND: [ { OR: [ { startDate: null }, { startDate: { lte: now } } ], }, { OR: [ { endDate: null }, { endDate: { gte: now } }, ], },],
    };

    // Fetch Active Campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: "ACTIVE",
        userType: { in: allowedUserTypes, },
        campaignType: { in: ["AUDIO", "MIXED"] },
        ...activeDateFilter,
      },
    });

    // Sort Campaigns by Priority
    campaigns.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Extract Ordered Audio IDs
    const orderedIds = [];
    for (const campaign of campaigns) {
      const ads = campaign.adsData || {};
      const audioIds = ads.audio || [];

      orderedIds.push(...audioIds);
    }

    // Remove Duplicates (keep order)
    const uniqueCampaignIds = [...new Set(orderedIds)];

    // Fetch All Eligible Audio Ads
    const allAudioAds = await prisma.audioAd.findMany({ where: { isActive: true, userType: { in: allowedUserTypes, }, ...activeDateFilter }, });

     // Split Campaign vs Non-Campaign Ads
    const campaignSet = new Set(uniqueCampaignIds);

    const campaignAds = [];
    const nonCampaignAds = [];
    for (const ad of allAudioAds) {
      if (campaignSet.has(ad.id)) {
        campaignAds.push(ad);
      } else {
        nonCampaignAds.push(ad);
      }
    }

    // Sort by Audio Priority
    campaignAds.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    nonCampaignAds.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Preserve Campaign Order
    const campaignMap = new Map(campaignAds.map((ad) => [ad.id, ad]));

    const orderedCampaignAds = [];
    for (const id of uniqueCampaignIds) {
      if (campaignMap.has(id)) {
        orderedCampaignAds.push(campaignMap.get(id));
        campaignMap.delete(id);
      }
    }

    // Final Merge
    const finalAds = [...orderedCampaignAds, ...nonCampaignAds];

    return finalAds;
  }

  async getBanners(customerId) {
    const now = new Date();

    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    const isPremiumUser = await checkPremiumSubscription(customerId);

    const allowedUserTypes = isPremiumUser ? ["ALL", "PREMIUM_USER"] : ["ALL", "FREE_USER"];

    // Common Date Filter
    const activeDateFilter = { 
      AND: [ { OR: [ { startDate: null }, { startDate: { lte: now } } ], }, { OR: [ { endDate: null }, { endDate: { gte: now } }, ], },],
    };

    // Fetch Active Campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: "ACTIVE",
        userType: { in: allowedUserTypes, },
        campaignType: { in: ["BANNER", "MIXED"] },
        ...activeDateFilter,
      },
    });

    
    
    // Sort Campaigns by Priority
    campaigns.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    // Extract Ordered Banner IDs
    const orderedIds = [];
    for (const campaign of campaigns) {
      const ads = campaign.adsData || {};
      const bannerIds = ads.banners || [];
      
      orderedIds.push(...bannerIds);
    }
    
    // Remove Duplicates (keep order)
    const uniqueCampaignIds = [...new Set(orderedIds)];
    
    // Fetch All Eligible Banner Ads
    const allBanners = await prisma.banner.findMany({ where: { isActive: true, userType: { in: allowedUserTypes, }, ...activeDateFilter } });
    
    // Split Campaign vs Non-Campaign Ads
    const campaignSet = new Set(uniqueCampaignIds);
    
    console.log("allBanners", allBanners);
    
    const campaignAds = [];
    const nonCampaignAds = [];
    for (const banner of allBanners) {
      if (campaignSet.has(banner.id)) {
        campaignAds.push(banner);
      } else {
        nonCampaignAds.push(banner);
      }
    }
    console.log("campaignAds", campaignAds);

    // Sort by Banner Priority
    campaignAds.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    nonCampaignAds.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Preserve Campaign Order
    const campaignMap = new Map(campaignAds.map((ad) => [ad.id, ad]));

    const orderedCampaignAds = [];
    for (const id of uniqueCampaignIds) {
      if (campaignMap.has(id)) {
        orderedCampaignAds.push(campaignMap.get(id));
        campaignMap.delete(id);
      }
    }

    // Final Merge
    const finalAds = [...orderedCampaignAds, ...nonCampaignAds];

    return finalAds;
  }
}

export default new commonService();