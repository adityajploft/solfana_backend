import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';
import emailService from '../../../common/services/email.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { buildExploreMoreAlbums, buildPopularAlbumsByPodcaster } from '../../../common/utils/analytics.helper.js';
import AlbumResource from '../resources/album.resource.js';
import { getUserProfileImage } from '../../../common/utils/helper.js';

class PodcasterService {

    async getPodcasterProfile(userId, customerId = null, lang = "en") {
        const podcaster = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                podcasterProfile: true,
                ...(customerId && { followers: { where: { customerId: customerId } } })
            }
        });

        if (!podcaster) {
            throw new HttpError(404, "PODCASTER_NOT_FOUND", "podcaster_not_found", "podcaster");
        }

        const language = await prisma.language.findFirst({
            where: { lang }
        });
        const languageId = language?.id || 1;

        const profileUpload = await prisma.upload.findFirst({
            where: { entityType: "USER", uploadType: "PROFILE_IMAGE", entityId: userId, isActive: true },
            orderBy: { createdAt: "desc" }
        });

        const podcasterProfile = await prisma.podcasterProfile.findUnique({ where: { userId } });

        const isFollowing = customerId ? podcaster.followers.length > 0 : false;

        const albums = await prisma.album.findMany({
            where: { podcasterId: userId, status: "PUBLISHED", deletedAt: null },
            include: {
                coverImage: true,

                tracks: {
                where: {
                    status: "PUBLISHED",
                    deletedAt: null
                },

                include: {
                    audioLibrary: true
                }
                }
            },

            orderBy: {
                createdAt: "desc"
            }
        });


        const popularAlbums = await buildPopularAlbumsByPodcaster({podcasterId: userId, languageId, limit: 10});
        const popular1 = AlbumResource.cardCollection(popularAlbums);

        const popular = popular1.map((album, index) => ({
            ...album,
            totalTracks: popularAlbums[index]?.tracks?.length || 0,
        }));

        const exploreMoreAlbums = await buildExploreMoreAlbums({podcasterId: userId, customerId, languageId, limit: 10});
        /* const exploreMore1 = AlbumResource.cardCollection(exploreMoreAlbums);
        const exploreMore = exploreMore1.map((album, index) => ({
            ...album,
            totalTracks: exploreMoreAlbums[index]?.tracks?.length || 0,
        })); */

        const exploreMore = exploreMoreAlbums.flatMap((album) =>
            album.tracks.map((track) => {
                return {
                    id: track.id,
                    title: track?.title || null,
                    trackNumber: track.trackNumber,
                    isExplicit: track.isExplicit,
                    coverImage: track.coverImage || null,
                    albumId: album.id,
                    cdn_url: track.audioLibrary?.cdnUrl || null
                };
            })
        );

        return {
            profile: {
                id: podcaster.id,
                name: podcaster.name,
                email: podcaster.email,
                phone: podcaster.phone,
                profileImage: profileUpload?.cdnUrl || null,
                bio: podcasterProfile?.bio || null,
                avatar: podcasterProfile?.avatar || null,
                isVerified: podcasterProfile?.isVerified || false,
                isFollowing: isFollowing
            },

            popular,

            exploreMore
        };
    }

    async toggleFollowPodcaster(customerId, podcasterId) {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            throw new HttpError(404, "CUSTOMER_NOT_FOUND", "customer_not_found", "customer");
        }

        const podcaster = await prisma.user.findFirst({
            where: { id: podcasterId, podcasterProfile: { isNot: null } }
        });

        if (!podcaster) {
            throw new HttpError(404, "PODCASTER_NOT_FOUND", "podcaster_not_found", "podcaster" );
        }

        const existing = await prisma.customerFollowPodcaster.findUnique({
            where: { customerId_podcasterId: { customerId, podcasterId } }
        });

        if (existing) {
            await prisma.customerFollowPodcaster.delete({ where: { customerId_podcasterId: { customerId, podcasterId } } });

            return { followed: false };
        }

        await prisma.customerFollowPodcaster.create({data: { customerId, podcasterId } });

        // Send Email to Podcaster
        const lang = await getUserLanguage(podcaster?.languageId);
        await emailService.sendMailToPodcasterFollow(podcaster, customer, lang);

        return { followed: true };
    }

    async getFollowedPodcasters(customerId, dto) {
        const { page, limit, search } = dto;

        const where = {
            customerId,
            podcaster: {
                name: {
                    contains: search,
                    mode: "insensitive"
                }
            }
        };

        const usePagination = page && limit;
        const skip = usePagination ? (page - 1) * limit : undefined;
        const take = usePagination ? limit : undefined;

        const followed = await prisma.customerFollowPodcaster.findMany({
            where,
            include: {
                podcaster: true
            },
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take
        });

        const totalDocs = await prisma.customerFollowPodcaster.count({
            where
        });

        const records = await Promise.all(
            followed.map(async (item) => {
                const podcasterProfileImage = await getUserProfileImage(item.podcaster);

                return {
                    id: item.podcaster.id,
                    name: item.podcaster.name,
                    profileImage: podcasterProfileImage
                };
            })
        );


        return {
            records,
            /* records: followed.map((item) => ({
                const podcasterProfileImage = await getUserProfileImage(this.podcaster);
                id: item.podcaster.id,
                name: item.podcaster.name,
                profileImage: podcasterProfileImage
            })), */
            pagination: {
                totalDocs,
                totalPages: usePagination
                    ? Math.ceil(totalDocs / limit)
                    : 1,
                page: usePagination ? page : 1,
                limit: usePagination ? limit : totalDocs
            }
        };
    }

}

export default new PodcasterService(); 