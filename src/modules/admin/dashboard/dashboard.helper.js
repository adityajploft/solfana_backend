import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { activeOnly } from '../../../common/utils/isDeletedHelper.js';
import dayjs from 'dayjs';

class DashboardHelper {
    // ================= COUNTS =================
    async getCustomerCount({ start, end }) {
        const result = await prisma.customer.groupBy({
            by: ["isActive"],
            where: {
                ...(start && end && {
                    createdAt: { gte: start, lte: end }
                }),
            },
             _count: { _all: true, },
        });
        

        let active = 0;
        let inactive = 0;
        result.forEach((row) => {
            if (row.isActive) {
                active = row._count._all;
            } else {
                inactive = row._count._all;
            }
        });

        return {
            total: active + inactive,
            active,
            inactive,
        };
    }

    async getPodcasterCount({ start, end }) {
        return prisma.user.count({
            where: {
                roleId: 4,
                ...(start && end && {
                    createdAt: { gte: start, lte: end }
                })
            }
        });
    }

    async getTotalListeningTime({ start, end }) {
        const result = await prisma.trackAnalytics.aggregate({
            where: {
                ...(start && end && {
                    date: { gte: start, lte: end }
                })
            },
            _sum: { totalListenSec: true }
        });

        return result._sum.totalListenSec || 0;
    }

    async getTotalPodcastTracks({ start, end }) {
        return prisma.track.count({
            where: {
                deletedAt: null,
                ...(start && end && {
                    createdAt: { gte: start, lte: end }
                })
            }
        });
    }

    async getConversionStats({ start, end }) {
        const totalConversions = await prisma.subscriptionConversion.count({
            where: {
                ...(start && end && {
                    conversionDate: { gte: start, lte: end }
                })
            }
        });

        const totalUsers = await prisma.customer.count();

        return totalUsers ? ((totalConversions / totalUsers) * 100).toFixed(2) : 0;
    }
    
    async getTotalRevenue({ start, end }) {
        const totalRevenue = await prisma.transaction.aggregate({
            where: {
                status: "SUCCESS",
            },
            _sum: {
                amount: true,
            },
        });

        return totalRevenue._sum.amount || 0;
    }

    // ================= GRAPHS =================
    async getListeningTimeGraph({ start, end }) {
        return prisma.trackAnalytics.groupBy({
            by: ['date'],
            where: {
                ...(start && end && {
                    date: { gte: start, lte: end }
                })
            },
            _sum: { totalListenSec: true },
            orderBy: { date: 'asc' }
        });
    }

    async getUserGrowthGraph({ start, end }) {
        let where = '';
        const params = [];

        if (start) {
            params.push(start);
            where += ` AND "created_at" >= $${params.length}`;
        }

        if (end) {
            params.push(end);
            where += ` AND "created_at" <= $${params.length}`;
        }

        return prisma.$queryRawUnsafe(`
            SELECT DATE("created_at") as date, COUNT(*)::int as count
            FROM "customers"
            WHERE 1=1
            ${where}
            GROUP BY DATE("created_at")
            ORDER BY date ASC
        `, ...params);
    }

    async getConversionGraph({ start, end }) {
        return prisma.subscriptionConversion.groupBy({
            by: ['conversionDate'],
            where: {
                ...(start && end && {
                    conversionDate: { gte: start, lte: end }
                })
            },
            _count: true,
            orderBy: { conversionDate: 'asc' }
        });
    }

    // ================= INSIGHTS =================
    async getTopPodcastTracks({ start, end, lang }) {
        const topTracksAgg = await prisma.trackAnalytics.groupBy({
            by: ['trackId'],
            where: {
                ...(start && end && {
                    date: { gte: start, lte: end }
                }),
                track: {
                    album: { type: "PODCAST" }
                }
            },
            _sum: {
                totalListenSec: true,
                totalPlays: true
            },
            orderBy: {
                _sum: { totalListenSec: 'desc' }
            },
            take: 10
        });

        const trackIds = topTracksAgg.map(t => t.trackId);

        const tracks = await prisma.track.findMany({
            where: { id: { in: trackIds } },
                include: {
                    audioLibrary: true,
                    album: {
                        include: {
                            coverImage: true
                        }
                    }
                }
            });

        return topTracksAgg.map(agg => {
            const track = tracks.find(t => t.id === agg.trackId);

            // cover image
            const coverImage = track.coverImage ? track.coverImage : track.album.coverImage?.cdnUrl;    
            const coverImageUrl = coverImage.startsWith('http') ? coverImage : `https://${coverImage}`;

            // audio url
            const audioUrl = track.audioLibrary?.cdnUrl ? track.audioLibrary.cdnUrl.startsWith('http') ? track.audioLibrary.cdnUrl : `https://${track.audioLibrary.cdnUrl}` : null;


            const title = track?.title;
            const albumTitle = track?.album?.title;

            return {
                track_id: agg.trackId,
                total_listen_sec: agg._sum.totalListenSec,
                total_plays: agg._sum.totalPlays,
                
                track_title: title,
                album_title: albumTitle,

                cover_image: coverImageUrl,
                audio_url: audioUrl,
            };
        });
    }

    async getListeningTimePerUser({ start, end }) {
        const topUsers = await prisma.userAnalytics.groupBy({
            by: ['customerId'],
            where: {
                ...(start && end && {
                    date: { gte: start, lte: end }
                })
            },
            _sum: { totalListenSec: true },
            orderBy: {
                _sum: { totalListenSec: 'desc' }
            },
            take: 10
        });

        const customers = await prisma.customer.findMany({
            where: {
                id: { in: topUsers.map(u => u.customerId) }
            },
            select: {
                id: true,
                name: true,
                profileImage: true
            }
        });

        const map = new Map(customers.map(c => [c.id, c]));

        return topUsers.map(u => ({
            customer_id: u.customerId,
            total_listen_sec: u._sum.totalListenSec,
            name: map.get(u.customerId)?.name,
            profile_image: map.get(u.customerId)?.profileImage
        }));
    }
}

export default new DashboardHelper();