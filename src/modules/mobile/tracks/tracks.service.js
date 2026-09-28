// album.service.js
import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';
import TrackResource from '../resources/track.resource.js';

class TrackService {

    async getTrackDetails(trackId, lang, customerId) {
        const track = await prisma.track.findFirst({
            where: {
                id: trackId,
                deletedAt: null,
                status: "PUBLISHED"
            },
            include: {
                
                audioLibrary: {
                    select: {
                        cdnUrl: true,
                        durationSeconds: true
                    }
                },
                album: {
                    include: {
                        coverImage: true,                        
                        podcaster: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true
                            }
                        },
                        categories: {
                            select: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!track) {
            throw new HttpError(404, "TRACK_NOT_FOUND", "track not found", "track");
        }

        const favorite = await prisma.favorite.findFirst({
            where: {
                customerId,
                entityId: trackId,
                entityType: "TRACK"
            }
        });

        const library = await prisma.library.findFirst({
            where: {
                customerId,
                entityId: trackId,
                entityType: "TRACK"
            }
        });

        const playlistTracks = await prisma.playlistTrack.findMany({
            where: {
                trackId: trackId,
                playlist: {
                    customerId: customerId,
                    deletedAt: null
                }
            },
            include: {
                playlist: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        const likesCount = await prisma.like.count({
            where: {
                entityId: trackId,
                entityType: "TRACK",
                type: "LIKE"
            }
        });

        const dislikesCount = await prisma.like.count({
            where: {
                entityId: trackId,
                entityType: "TRACK",
                type: "DISLIKE"
            }
        });

        const userReaction = await prisma.like.findFirst({
            where: {
                customerId,
                entityId: trackId,
                entityType: "TRACK"
            }
        });

        const trackData = await new TrackResource(track, lang).details({
            isAddedToFavourite: !!favorite,
            is_added_library: !!library,
            likesCount,
            dislikesCount,
            isLiked: userReaction?.type === "LIKE",
            isDisliked: userReaction?.type === "DISLIKE"
        });

        return {
            ...trackData,
            isAddedToPlaylist: playlistTracks.length > 0,
            ...(playlistTracks.length > 0 && {
                playlist: playlistTracks.map(item => ({
                    id: item.playlist.id,
                    name: item.playlist.title
                }))
            })
        };
    }

}

export default new TrackService();