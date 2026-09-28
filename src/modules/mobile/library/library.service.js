import prisma from '../../../config/db.config.js';
import TrackResource from '../resources/track.resource.js';
import PlaylistResource from '../resources/playlist.resourse.js';
import PodcasterResource from '../resources/podcaster.resource.js';
import HttpError from '../../../common/errors/http.error.js';
import AlbumResource from '../resources/album.resource.js';

class LibraryService {

    async index(customerId, query, languageId, lang) {
        const { search = '' } = query;

        // YOUR LIBRARY
        const libraries = await prisma.library.findMany({
            where: {
                customerId
            }
        });

        const libraryTrackIds = libraries.filter(item => item.entityType === 'TRACK').map(item => item.entityId);

        const libraryAlbumIds = libraries.filter(item => item.entityType === 'ALBUM').map(item => item.entityId);

        let libraryTracks = [];
        let libraryAlbums = [];
        if (libraryTrackIds.length) {
            libraryTracks = await prisma.track.findMany({
                where: { id: { in: libraryTrackIds },
                    ...(typeof search === "string" && search.trim() && {
                        title: { contains: search.trim(), mode: "insensitive" }
                    })
                },
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
                },
                take: 10
            });
        }

        if (libraryAlbumIds.length) {
            libraryAlbums = await prisma.album.findMany({
                where: { id: { in: libraryAlbumIds },
                    ...(typeof search === "string" && search.trim() && {
                        title: { contains: search.trim(), mode: "insensitive" }
                    })
                },
                include: {
                    coverImage: true,
                    podcaster: true
                },
                take: 10
            });
        }

        const yourLibrary = [
            ...AlbumResource.cardCollection(libraryAlbums).map(item => ({ ...item, type: 'ALBUM' })),

            ...TrackResource.cardCollection(libraryTracks, lang).map(item => ({ ...item, type: 'TRACK' }))
        ];

        // FAVORITES
        const favoriteTrackIds = await prisma.favorite.findMany({
            where: {
                customerId,
                entityType: 'TRACK'
            }
        });

        const trackIds = favoriteTrackIds.map(item => item.entityId);

        let favoriteTracks = [];

        if (trackIds.length) {
            favoriteTracks = await prisma.track.findMany({
                where: {
                    id: {
                        in: trackIds
                    },
                    ...(typeof search === "string" && search.trim() && {
                        title: { contains: search.trim(), mode: "insensitive" }
                    })
                },
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
                },
                take: 10
            });
        }

        const favorites = TrackResource.cardCollection(favoriteTracks, lang);

        // PLAYLISTS
        const playlists = await prisma.playlist.findMany({
            where: {
                customerId,
                deletedAt: null,
                ...(typeof search === "string" && search.trim() && {
                OR: [
                        {
                            title: {
                                contains: search.trim(),
                                mode: "insensitive"
                            }
                        },
                        {
                            tracks: {
                                some: {
                                    track: {
                                        title: {
                                            contains: search.trim(),
                                            mode: "insensitive"
                                        }
                                    }
                                }
                            }
                        }
                    ]
                })
            },
            include: {
                _count: {
                    select: {
                        tracks: true
                    }
                }
            },
            take: 10
        });

        // LIKED
        const likes = await prisma.like.findMany({ where: { customerId } });

        const likedAlbumIds = likes.filter(item => item.entityType === 'ALBUM').map(item => item.entityId);

        const likedTrackIds = likes.filter(item => item.entityType === 'TRACK').map(item => item.entityId);

        let likedAlbums = [];
        let likedTracks = [];
        if (likedAlbumIds.length) {
            likedAlbums = await prisma.album.findMany({
                where: {
                    id: {
                        in: likedAlbumIds
                    },
                    ...(typeof search === "string" && search.trim() && {
                        title: {
                            contains: search.trim(),
                            mode: "insensitive"
                        }
                    })
                },
                include: {
                    coverImage: true,
                    podcaster: true
                },
                take: 10
            });
        }

        if (likedTrackIds.length) {
            likedTracks = await prisma.track.findMany({
                where: {
                    id: {
                        in: likedTrackIds
                    },

                    ...(typeof search === "string" && search.trim() && {
                        title: {
                            contains: search.trim(),
                            mode: "insensitive"
                        }
                    })
                },
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
                },
                take: 10
            });
        }

        const liked = [
            ...AlbumResource.cardCollection(likedAlbums).map(item => ({ ...item, type: 'ALBUM' })),
            ...TrackResource.cardCollection(likedTracks, lang).map(item => ({ ...item, type: 'TRACK' }))
        ];

        // FOLLOWED PODCASTERS
        const followedPodcastersData = await prisma.customerFollowPodcaster.findMany({
            where: {
                customerId,
                ...(search && {
                    podcaster: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                })
            },
            include: {
                podcaster: true
            },
            take: 10
        });

        const followedPodcasters = followedPodcastersData.map(item => item.podcaster);

        return {
            yourLibrary,
            downloads: [],
            favorites,
            playlists: await PlaylistResource.cardCollection(playlists),
            liked,
            followedPodcasters: await PodcasterResource.cardCollection(followedPodcasters)
        };
    }

    async toggleLibrary(customerId, body) {
        const { entityId, entityType } = body;

        if (entityType === 'TRACK') {
            const track = await prisma.track.findFirst({
                where: {
                    id: entityId,
                    status: 'PUBLISHED',
                    deletedAt: null
                }
            });

            if (!track) {
                throw new HttpError(
                    400,
                    'TRACK_NOT_FOUND',
                    'Track not found',
                    'track'
                );
            }
        }

        if (entityType === 'ALBUM') {
            const album = await prisma.album.findFirst({
                where: {
                    id: entityId,
                    status: 'PUBLISHED',
                    deletedAt: null
                }
            });

            if (!album) {
                throw new HttpError(
                    400,
                    'ALBUM_NOT_FOUND',
                    'Album not found',
                    'album'
                );
            }
        }

        const library = await prisma.library.findFirst({
            where: {
                customerId,
                entityId,
                entityType
            }
        });

        if (library) {
            await prisma.library.delete({
                where: {
                    id: library.id
                }
            });

            return {
                action: 'removed'
            };
        }

        await prisma.library.create({
            data: {
                customerId,
                entityId,
                entityType
            }
        });

        return {
            action: 'added'
        };
    }

    async toggleFavorite(customerId, body) {
        const { entityId, entityType } = body;

        if (entityType === 'TRACK') {
            const track = await prisma.track.findFirst({
                where: {
                    id: entityId,
                    status: 'PUBLISHED',
                    deletedAt: null
                }
            });

            if (!track) {
                throw new HttpError(400, 'TRACK_NOT_FOUND', 'Track not found', 'track');
            }
        }

        if (entityType === 'ALBUM') {
            const album = await prisma.album.findFirst({
                where: {
                    id: entityId,
                    status: 'PUBLISHED',
                    deletedAt: null
                }
            });

            if (!album) {
                throw new HttpError(400, 'ALBUM_NOT_FOUND', 'Album not found', 'album');
            }
        }

        const favorite = await prisma.favorite.findFirst({
            where: {
                customerId,
                entityId,
                entityType
            }
        });

        if (favorite) {
            await prisma.favorite.delete({
                where: {
                    id: favorite.id
                }
            });

            return {
                action: 'removed'
            };
        }

        await prisma.favorite.create({
            data: {
                customerId,
                entityId,
                entityType
            }
        });

        return {
            action: 'added'
        };
    }

    async toggleLike(customerId, body) {
        const { entityId, entityType, type } = body;

        if (!['LIKE', 'DISLIKE'].includes(type)) {
            throw new HttpError(400, 'INVALID_TYPE', 'Invalid type', 'type');
        }

        if (entityType === 'TRACK') {
            const track = await prisma.track.findFirst({
                where: {
                    id: entityId,
                    status: 'PUBLISHED',
                    deletedAt: null
                }
            });

            if (!track) {
                throw new HttpError(400, 'TRACK_NOT_FOUND', 'Track not found', 'track');
            }
        }

        if (entityType === 'ALBUM') {
            const album = await prisma.album.findFirst({
                where: {
                    id: entityId,
                    status: 'PUBLISHED',
                    deletedAt: null
                }
            });

            if (!album) {
                throw new HttpError(400, 'ALBUM_NOT_FOUND', 'Album not found', 'album');
            }
        }

        const like = await prisma.like.findFirst({
            where: {
                customerId,
                entityId,
                entityType
            }
        });

        if (!like) {
            await prisma.like.create({
                data: {
                    customerId,
                    entityId,
                    entityType,
                    type
                }
            });

            return {
                action: 'added'
            };
        }

        if (like.type === type) {
            await prisma.like.delete({
                where: {
                    id: like.id
                }
            });

            return {
                action: 'removed',
                previousType: like.type
            };
        }

        await prisma.like.update({
            where: {
                id: like.id
            },
            data: {
                type
            }
        });

        return {
            action: 'updated'
        };
    }

    async seeAllFavorites(customerId, query, languageId, lang) {
        const { type = 'all', search = '', page = 1 } = query;

        const limit = 10;
        const skip = (Number(page) - 1) * limit;

        const favorites = await prisma.favorite.findMany({
            where: {
                customerId,
                entityType: 'TRACK'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const trackIds = favorites.map(item => item.entityId);

        let tracks = [];

        if (trackIds.length) {
            tracks = await prisma.track.findMany({
                where: {
                    id: {
                        in: trackIds
                    },
                    status: 'PUBLISHED',
                    deletedAt: null,
                    ...(type !== 'all' && {
                        album: {
                            type: type.toUpperCase()
                        }
                    }),
                    ...(typeof search === "string" && search.trim() && {
                        title: {
                        contains: search.trim(),
                        mode: "insensitive"
                        }
                    })
                },
                include: {
                    audioLibrary: {
                        select: {
                            cdnUrl: true,
                            durationSeconds: true
                        }
                    },
                    album: {
                        include: { coverImage: true, podcaster: true, categories: { select: { category: true } } }
                    }
                }
            });
        }

        if (type === 'all') {
            const audiobookTracks = tracks.filter(
                track => track.album?.type === 'AUDIOBOOK'
            );

            const podcastTracks = tracks.filter(
                track => track.album?.type === 'PODCAST'
            );

            return {
                records: {
                    audiobook: TrackResource.cardCollection(audiobookTracks, lang),
                    podcast: TrackResource.cardCollection(podcastTracks, lang)
                },
                pagination: {
                    total: tracks.length,
                    page: Number(page),
                    limit,
                    pages: Math.ceil(tracks.length / limit)
                }
            };
        }

        const records = TrackResource.cardCollection(tracks, lang).slice(skip, skip + limit);

        return {
            records,
            pagination: {
                total: tracks.length,
                page: Number(page),
                limit,
                pages: Math.ceil(tracks.length / limit)
            }
        };
    }



    async seeAllLikes(customerId, query, languageId, lang) {
        const { type = 'all', search = '', page = 1 } = query;

        const limit = 10;
        const skip = (Number(page) - 1) * limit;

        const likes = await prisma.like.findMany({
            where: {
                customerId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const albumIds = likes
            .filter(item => item.entityType === 'ALBUM')
            .map(item => item.entityId);

        const trackIds = likes
            .filter(item => item.entityType === 'TRACK')
            .map(item => item.entityId);

        let albums = [];
        let tracks = [];

        if (albumIds.length) {
            albums = await prisma.album.findMany({
                where: {
                    id: { in: albumIds },
                    status: "PUBLISHED",
                    deletedAt: null,
                    ...(type !== "all" && { type: type.toUpperCase() }),
                    ...(typeof search === "string" && search.trim() && { title: { contains: search.trim(), mode: "insensitive" } })
                },
                include: {
                    coverImage: true,
                    podcaster: true
                }
            });
        }

        if (trackIds.length) {
            tracks = await prisma.track.findMany({
                where: {
                    id: { in: trackIds },
                    status: "PUBLISHED",
                    deletedAt: null,
                    ...(type !== "all" && { album: { type: type.toUpperCase() }}),
                    ...(typeof search === "string" && search.trim() && { title: { contains: search.trim(), mode: "insensitive" }})
                },
                include: {
                    album: {
                        include: { coverImage: true, podcaster: true, categories: { select: { category: true } }}
                    },
                    audioLibrary: { select: { cdnUrl: true, durationSeconds: true } }
                }
            });
        }

        const albumRecords = AlbumResource.cardCollection(albums).map(item => ({
            ...item,
            type: 'ALBUM'
        }));

        const trackRecords = TrackResource.cardCollection(tracks, lang).map(item => ({
            ...item,
            type: 'TRACK'
        }));

        const merged = [
            ...albumRecords,
            ...trackRecords
        ];

        const records = merged.slice(skip, skip + limit);

        return {
            records,
            pagination: {
                total: merged.length,
                page: Number(page),
                limit,
                pages: Math.ceil(merged.length / limit)
            }
        };
    }
}

export default new LibraryService();