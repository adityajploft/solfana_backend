import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { notificationQueue } from '../../../common/queues/notification.queue.js';

class TrackService {

    async recalculateAlbumDuration(tx, albumId) {
        const result = await tx.track.aggregate({
            where: { albumId, deletedAt: null },
            _sum: { durationSeconds: true },
        });

        await tx.album.update({
            where: { id: albumId },
            data: {
                totalDuration: result._sum.durationSeconds || 0,
            },
        });
    }

    async create(data, userId) {
        return prisma.$transaction(async (tx) => {

            if (data.trackNumber !== undefined && typeof data.trackNumber === 'string') {
                const parsed = parseInt(data.trackNumber, 10);

                if (!isNaN(parsed)) {
                    data.trackNumber = parsed;
                }
            }

            const album = await tx.album.findFirst({
                where: { id: data.albumId, deletedAt: null }
            });

            if (!album) {
                throw new HttpError(404, 'ALBUM_NOT_FOUND', 'album_not_found', 'track');
            }

            if (data.audioLibraryId) {
                const audio = await tx.audioLibrary.findFirst({
                    where: { id: data.audioLibraryId, deletedAt: null },
                });

                if (!audio) {
                    throw new HttpError(404, 'AUDIO_NOT_FOUND', 'audio_not_found', 'track');
                }
                data.durationSeconds = audio.durationSeconds;
            }

            const existingTrackNumber = await tx.track.findFirst({
                where: {
                    albumId: data.albumId,
                    trackNumber: data.trackNumber,
                    deletedAt: null
                }
            });

            if (existingTrackNumber) {
                throw new HttpError(409, 'TRACK_NUMBER_ALREADY_EXISTS', 'track_number_already_exists', 'track');
            }

            const track = await tx.track.create({
                data: {
                    albumId: data.albumId,
                    audioLibraryId: data.audioLibraryId,

                    title: data.title,
                    description: data.description || null,

                    durationSeconds: data.durationSeconds || 0,
                    trackNumber: data.trackNumber,

                    status: data.status || "DRAFT",

                    isExplicit: data.isExplicit ?? false,

                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,

                    coverImage: data.coverImage || null
                }
            });

            await this.recalculateAlbumDuration(tx, data.albumId);

            if (track.status === 'PUBLISHED') {
                await notificationQueue.add('new-content-published', { contentId: track.id, type: "track" });
            }

            if (data.status !== undefined && data.status === 'PENDING_APPROVAL') {
                const request = await tx.albumPublishRequest.create({
                    data: {
                        trackId: track.id,
                        requestedBy: userId
                    }
                });
            }

            return track;
        });
    }

    async update(id, data, userId) {
        return prisma.$transaction(async (tx) => {

            const track = await tx.track.findFirst({
                where: { id, deletedAt: null }
            });

            if (!track) {
                throw new HttpError(404, 'TRACK_NOT_FOUND', 'track_not_found', 'track');
            }

            if (data.trackNumber !== undefined && typeof data.trackNumber === 'string') {
                const parsed = parseInt(data.trackNumber, 10);

                if (!isNaN(parsed)) {
                    data.trackNumber = parsed;
                }
            }

            if (data.audioLibraryId) {
                const audio = await tx.audioLibrary.findFirst({
                    where: { id: data.audioLibraryId, deletedAt: null },
                });

                if (!audio) {
                    throw new HttpError(404, 'AUDIO_NOT_FOUND', 'audio_not_found', 'track');
                }
                data.durationSeconds = audio.durationSeconds;
            }

            if (data.trackNumber !== undefined && data.trackNumber !== track.trackNumber) {
                const existingTrackNumber = await tx.track.findFirst({
                    where: {
                        albumId: track.albumId,
                        trackNumber: data.trackNumber,
                        deletedAt: null,
                        NOT: {
                            id
                        }
                    }
                });

                if (existingTrackNumber) {
                    throw new HttpError(409, 'TRACK_NUMBER_ALREADY_EXISTS', 'track_number_already_exists', 'track');
                }
            }

            const trackData = {};
            if (data.audioLibraryId !== undefined) {
                trackData.audioLibraryId = data.audioLibraryId;
            }

            if (data.title !== undefined) {
                trackData.title = data.title;
            }

            if (data.description !== undefined) {
                trackData.description = data.description || null;
            }

            if (data.durationSeconds !== undefined) {
                trackData.durationSeconds = data.durationSeconds;
            }

            if (data.trackNumber !== undefined) {
                trackData.trackNumber = data.trackNumber;
            }

            if (data.status !== undefined) {
                trackData.status = data.status;
            }

            if (data.isExplicit !== undefined) {
                trackData.isExplicit = data.isExplicit;
            }

            if (data.scheduledAt !== undefined) {
                trackData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
            }

            if (data.publishedAt !== undefined) {
                trackData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
            }

            if (data.coverImage !== undefined) {
                trackData.coverImage = data.coverImage || null;
            }

            await tx.track.update({
                where: { id },
                data: trackData
            });

            await this.recalculateAlbumDuration(tx, track.albumId);

            if (data.status !== undefined && data.status === 'PENDING_APPROVAL') {
                await tx.albumPublishRequest.create({
                    data: { trackId: track.id, requestedBy: userId }
                });
            }

            return tx.track.findUnique({ where: { id } });
        });
    }

    async remove(id) {
        return prisma.$transaction(async (tx) => {

            const track = await tx.track.findFirst({
                where: { id, deletedAt: null }
            });

            if (!track) {
                throw new HttpError(404, 'TRACK_NOT_FOUND', 'track_not_found', 'track');
            }

            await tx.track.update({
                where: { id },
                data: { deletedAt: new Date() }
            });


            // Recalculate album duration after deletion
            await this.recalculateAlbumDuration(tx, track.albumId);

            return true;
        });
    }

    async index(albumId, lang, page = 1, limit = 10, search = '') {

        page = Number(page) || 1;
        limit = Number(limit) || 10;

        if (typeof search !== 'string') {
            search = '';
        }

        search = search.trim();

        const skip = (page - 1) * limit;

        const whereCondition = { albumId, deletedAt: null };

        if (search) {
            whereCondition.title = { contains: search, mode: 'insensitive' };
        }

        const [tracks, total, lastTrack] = await Promise.all([
            prisma.track.findMany({
                where: whereCondition,
                include: {
                    audioLibrary: {
                        select: {
                            originalName: true,
                            cdnUrl: true
                        }
                    }
                },
                orderBy: {
                    trackNumber: 'asc'
                },
                skip,
                take: limit
            }),

            prisma.track.count({
                where: whereCondition
            }),

            prisma.track.findFirst({
                where: { albumId, deletedAt: null },
                orderBy: { trackNumber: 'desc' },
                select: { trackNumber: true }
            })
        ]);

        const records = tracks.map((track) => ({
            id: track.id,
            trackNumber: track.trackNumber,

            albumId: track.albumId,

            title: track.title,
            description: track.description,

            durationSeconds: track.durationSeconds,

            status: track.status,
            isExplicit: track.isExplicit,
            scheduledAt: track.scheduledAt,
            publishedAt: track.publishedAt,
            coverImage: track.coverImage || null,
            audioLibrary: track.audioLibrary || null
        }));

        const nextTrackNumber = lastTrack ? lastTrack.trackNumber + 1 : 1;

        return {
            records,

            nextTrackNumber,

            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async show(id, lang) {
        const track = await prisma.track.findFirst({
            where: { id, deletedAt: null },
            include: {
                audioLibrary: {
                    select: {
                        originalName: true,
                        cdnUrl: true
                    }
                }
            }
        });

        if (!track) {
            throw new HttpError(404, 'TRACK_NOT_FOUND', 'track_not_found', 'track');
        }

        return {
            id: track.id,
            albumId: track.albumId,
            trackNumber: track.trackNumber,
            title: track.title,
            description: track.description,
            durationSeconds: track.durationSeconds,
            status: track.status,
            isExplicit: track.isExplicit,
            scheduledAt: track.scheduledAt,
            publishedAt: track.publishedAt,
            coverImage: track.coverImage || null,
            audioFileUrl: track.audioLibrary?.cdnUrl || null,
            audioFilename: track.audioLibrary?.originalName || null
        };
    }

    async publishTrack(trackId, user) {
        const track = await prisma.track.findUnique({
            where: { id: trackId },
        });

        if (!track) {
            throw new HttpError(404, 'TRACK_NOT_FOUND', 'track_not_found', 'track');
        }

        const album = await prisma.album.findUnique({
            where: { id: track.albumId }
        });

        if (!album) {
            throw new HttpError(404, 'ALBUM_NOT_FOUND', 'album_not_found', 'track');
        }

        const podcasterProfile = await prisma.podcasterProfile.findUnique({
            where: { userId: album.podcasterId },
            select: { isVerified: true }
        });

        const isVerified = podcasterProfile?.isVerified;

        if (user.roleId != 4 || (user.roleId == 4 && isVerified)) {
            const updatedTrack = await prisma.track.update({
                where: { id: trackId },
                data: {
                    status: "PUBLISHED",
                    publishedAt: new Date()
                }
            });

            // Send notification
            await notificationQueue.add('new-content-published', { contentId: updatedTrack.id, type: 'track' });

            return updatedTrack;
        }

        const existingRequest = await prisma.albumPublishRequest.findFirst({
            where: {
                trackId,
                status: 'PENDING'
            }
        });

        if (existingRequest) {
            throw new HttpError(400, 'REQUEST_ALREADY_SENT', 'request_already_sent', 'track');
        }

        await prisma.track.update({
            where: { id: trackId },
            data: { status: 'PENDING_APPROVAL' }
        });

        const request = await prisma.albumPublishRequest.create({
            data: {
                trackId,
                requestedBy: user.id
            }
        });

        return request;
    }

    async scheduleTrack(trackId, publishAt, userId) {
        const track = await prisma.track.findUnique({
            where: {
                id: trackId
            }
        });

        if (!track) {
            throw new HttpError(404, 'TRACK_NOT_FOUND', 'track_not_found', 'track');
        }

        const album = await prisma.album.findUnique({
            where: { id: track.albumId }
        });

        if (!album) {
            throw new HttpError(404, 'ALBUM_NOT_FOUND', 'album_not_found', 'track');
        }

        const podcasterProfile = await prisma.podcasterProfile.findUnique({
            where: { userId: album.podcasterId },
            select: { isVerified: true }
        });

        const isVerified = podcasterProfile?.isVerified;

        if (!isVerified) {
            throw new HttpError(403, 'ONLY_VERIFIED_PODCASTER_CAN_SCHEDULE', 'only_verified_podcaster_can_schedule', 'track');
        }

        const updatedTrack = await prisma.track.update({
            where: { id: trackId },
            data: { status: 'SCHEDULED', scheduledAt: new Date(publishAt) }
        });

        return updatedTrack;
    }

    async deleteSchedule(trackId) {
        const track = await prisma.track.findUnique({
            where: { id: trackId }
        });

        if (!track) {
            throw new HttpError(404, 'TRACK_NOT_FOUND', 'track_not_found', 'track');
        }

        if (track.status !== 'SCHEDULED') {
            throw new HttpError(400, 'TRACK_NOT_SCHEDULED', 'track_not_scheduled', 'track');
        }

        const updatedTrack = await prisma.track.update({
            where: { id: trackId },
            data: { status: 'DRAFT', scheduledAt: null }
        });

        return updatedTrack;
    }
}

export default new TrackService();