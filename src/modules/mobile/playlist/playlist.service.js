import HttpError from '../../../common/errors/http.error.js';
import { checkPremiumSubscription } from '../../../common/utils/helper.js';
import prisma from '../../../config/db.config.js';
import { config } from '../../../config/index.js';
import PlaylistResource from '../resources/playlist.resourse.js';
import TrackResource from '../resources/track.resource.js';

class PlaylistService {
    async create(customerId, body) {
        if (!body || !body.title || !body.title.trim()) {
            throw new HttpError(
                400,
                'TITLE_REQUIRED',
                'title_required',
                'playlist'
            );
        }

        const title = body.title.trim();

        const existingPlaylist = await prisma.playlist.findFirst({
            where: {
                customerId,
                title: {
                    equals: title,
                    mode: 'insensitive'
                },
                deletedAt: null
            }
        });

        if (existingPlaylist) {
            throw new HttpError(
                400,
                'PLAYLIST_ALREADY_EXISTS',
                'playlist_already_exists',
                'playlist'
            );
        }

        const isPremium = await checkPremiumSubscription(customerId);

        if(!isPremium){
            const playlistLimitFree = config('constants.free_max_playlist') || 1;

            const playlistCount = await prisma.playlist.count({
                where: {
                    customerId: customerId
                }
            });

            if(playlistCount >= playlistLimitFree){
                throw new HttpError(400, 'PLAYLIST_LIMIT_EXCCEED', 'playlist_limit_excceed', 'playlist');
            }
        }

        const playlist = await prisma.playlist.create({
            data: {
                customerId,
                title
            }
        });

        return {
            playlist_id: playlist.id
        };
    }

    async list({ customerId, page = 1, limit = 10, search = '' }) {
        page = Number(page);
        limit = Number(limit);

        const skip = (page - 1) * limit;

        const whereCondition = {
            customerId,
            deletedAt: null,
            ...(search && {
                title: {
                    contains: search,
                    mode: 'insensitive'
                }
            })
        };

        const [playlists, total] = await Promise.all([
            prisma.playlist.findMany({
                where: whereCondition,
                include: {
                    _count: {
                        select: {
                            tracks: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.playlist.count({
                where: whereCondition
            })
        ]);

        return {
            records: await PlaylistResource.cardCollection(playlists),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async delete(customerId, playlistId) {
        const playlist = await prisma.playlist.findFirst({
            where: {
                id: playlistId,
                customerId,
                deletedAt: null
            }
        });

        if (!playlist) {
            throw new HttpError(
                404,
                'PLAYLIST_NOT_FOUND',
                'playlist_not_found',
                'playlist'
            );
        }

        await prisma.playlist.update({
            where: {
                id: playlistId
            },
            data: {
                deletedAt: new Date()
            }
        });

        return {
            id: playlistId
        };
    }

    async addTracks(customerId, playlistId, trackIds) {
        if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
            throw new HttpError(
                400,
                'TRACKS_REQUIRED',
                'tracks are required',
                'trackIds'
            );
        }

        const playlist = await prisma.playlist.findFirst({
            where: {
                id: playlistId,
                customerId
            }
        });

        if (!playlist) {
            throw new HttpError(
                404,
                'PLAYLIST_NOT_FOUND',
                'playlist not found',
                'playlist'
            );
        }

        const tracks = await prisma.track.findMany({
            where: {
                id: {
                    in: trackIds
                },
                deletedAt: null
            },
            select: {
                id: true
            }
        });

        const existingTrackIds = tracks.map(track => track.id);

        const invalidTrackIds = trackIds.filter(
            id => !existingTrackIds.includes(id)
        );

        if (invalidTrackIds.length > 0) {
            throw new HttpError(
                400,
                'TRACKID_NOT_FOUND',
                'track_ids_not_found: ' + invalidTrackIds.join(', '),
                'playlist'
            );
        }

        const existingPlaylistTracks = await prisma.playlistTrack.findMany({
            where: {
                playlistId,
                trackId: {
                    in: trackIds
                }
            },
            select: {
                trackId: true
            }
        });

        const alreadyAddedIds = existingPlaylistTracks.map(item => item.trackId);

        if (trackIds.length === 1 && alreadyAddedIds.includes(trackIds[0])) {
            throw new HttpError(
                400,
                'TRACK_ALREADY_EXISTS',
                'track already exists in playlist',
                'playlist'
            );
        }

        const newTracks = trackIds
            .filter(trackId => !alreadyAddedIds.includes(trackId))
            .map(trackId => ({
                playlistId,
                trackId
            }));

        if (newTracks.length > 0) {
            await prisma.playlistTrack.createMany({
                data: newTracks
            });
        }

        return null;
    }

    async removeTrack(customerId, playlistId, trackId) {

        if (playlistId) {
            const playlist = await prisma.playlist.findFirst({
                where: {
                    id: playlistId,
                    customerId,
                    deletedAt: null
                }
            });

            if (!playlist) {
                throw new HttpError(
                    404,
                    'PLAYLIST_NOT_FOUND',
                    'playlist_not_found',
                    'playlist'
                );
            }

            const track = await prisma.playlistTrack.findFirst({
                where: {
                    playlistId,
                    trackId
                }
            });

            if (!track) {
                throw new HttpError(
                    404,
                    'TRACK_NOT_FOUND_IN_PLAYLIST',
                    'track_not_found_in_playlist',
                    'playlist'
                );
            }

            return prisma.playlistTrack.deleteMany({
                where: {
                    playlistId,
                    trackId
                }
            });
        }

        const deletedTracks = await prisma.playlistTrack.deleteMany({
            where: {
                trackId,
                playlist: {
                    customerId,
                    deletedAt: null
                }
            }
        });

        if (deletedTracks.count === 0) {
            throw new HttpError(
                404,
                'TRACK_NOT_FOUND_IN_PLAYLIST',
                'track_not_found_in_playlist',
                'playlist'
            );
        }

        return deletedTracks;
    }

    async details(customerId, playlistId, lang) {
        const playlist = await prisma.playlist.findFirst({
            where: {
                id: playlistId,
                customerId,
                deletedAt: null
            },
            include: {
                tracks: {
                    include: {
                        track: {
                            include: {
                                album: {
                                    include: {
                                        coverImage: true
                                    }
                                },
                                audioLibrary: true
                            }
                        }
                    }
                }
            }
        });

        if (!playlist) {
            throw new HttpError(
                404,
                'PLAYLIST_NOT_FOUND',
                'playlist_not_found',
                'playlist'
            );
        }

        return {
            id: playlist.id,
            title: playlist.title,
            tracks: playlist.tracks.map(item => {
                return {
                    id: item.track.id,
                    title: item.track?.title,
                    isExplicit: item.track?.isExplicit ?? false,
                    // coverImage: item.track.album.coverImage?.cdnUrl || null,
                    coverImage: item.track.coverImage ? item.track.coverImage : item.track.album.coverImage.cdnUrl,
                    durationMinutes: Math.ceil(item.track.durationSeconds / 60)
                };
            })
        };
    }

    async getPlaylistTracks(customerId, playlistId, lang, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        // 1. Validate playlist ownership
        const playlist = await prisma.playlist.findFirst({
            where: {
            id: playlistId,
            customerId
            },
            select: { id: true }
        });

        if (!playlist) {
            throw new HttpError(
            404,
            'PLAYLIST_NOT_FOUND',
            'playlist_not_found',
            'playlist'
            );
        }

        // 2. Get paginated tracks
        const [playlistTracks, total] = await Promise.all([
            prisma.playlistTrack.findMany({
                where: {
                    playlistId
                },

                skip,
                take: limit,

                orderBy: {
                    createdAt: "asc"
                },

                include: {
                    track: {
                        include: {
                            album: {
                                include: {
                                    coverImage: true,
                                    podcaster: true,
                                    categories: {
                                        select: {
                                            category: true
                                        }
                                    }
                                }
                            },
                            audioLibrary: {
                                select: {
                                    cdnUrl: true,
                                    durationSeconds: true
                                }
                            }
                        }
                    }
                }
            }),

            prisma.playlistTrack.count({
                where: { playlistId }
            })
        ]);

        // 3. Extract actual tracks
        const tracks = playlistTracks.map(pt => pt.track);

        return {
            tracks: TrackResource.cardCollection(tracks, lang),

            pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
            }
        };
    }
}

export default new PlaylistService();