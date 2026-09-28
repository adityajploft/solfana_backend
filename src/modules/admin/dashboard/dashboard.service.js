import bunnycdnService from '../../../common/services/bunnycdn.service.js';
import DashboardHelper from './dashboard.helper.js';

class DashboardService {

  // ================= COUNTS =================
  async getCounts({ start, end }) {
    const userCounts = await DashboardHelper.getCustomerCount({ start, end });
    return {
      total_users: userCounts.total,
      total_active_users: userCounts.active,
      total_inactive_users: userCounts.inactive,
      total_podcasters: await DashboardHelper.getPodcasterCount({ start, end }),
      total_listening_time: await DashboardHelper.getTotalListeningTime({ start, end }),
      total_podcasts: await DashboardHelper.getTotalPodcastTracks({ start, end }),
      total_revenue: await DashboardHelper.getTotalRevenue({ start, end }),
    };
  }

  // ================= GRAPHS =================
  async getListeningTimeGraph(filter) {
    return DashboardHelper.getListeningTimeGraph(filter);
  }

  async getUserGrowthGraph(filter) {
    return DashboardHelper.getUserGrowthGraph(filter);
  }

  async getConversionGraph(filter) {
    return DashboardHelper.getConversionGraph(filter);
  }

  // ================= INSIGHTS =================
  async getTopTracks({ start, end, lang }) {
    return DashboardHelper.getTopPodcastTracks({ start, end, lang });
  }

  async getListeningPerUser({ start, end }) {
    return DashboardHelper.getListeningTimePerUser({ start, end });
  }

  // ================= STORAGE =================
  async getStorageUsage() {
    return bunnycdnService.getCDNData();
  }
}

export default new DashboardService();