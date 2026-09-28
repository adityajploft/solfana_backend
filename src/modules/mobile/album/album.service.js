// album.service.js
import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';
import TrackResource from '../resources/track.resource.js';

class AlbumService {

  async getAlbumTracks(albumId, lang, { page = 1, limit = 10, search } = {}, customerId) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        deletedAt: null,
        status: "PUBLISHED"
      },
      include: {
        coverImage: true
      }
    });

    if (!album) {
      throw new HttpError(404, "ALBUM_NOT_FOUND", "album not found", "album");
    }

    const skip = (page - 1) * limit;

    const where = {
      albumId,
      deletedAt: null,
      status: "PUBLISHED",
      ...(search?.trim() && {
        title: {
          contains: search.trim(),
          mode: "insensitive"
        }
      })
    };

    const total = await prisma.track.count({ where });

    const tracks = await prisma.track.findMany({
      where,
      skip,
      take: limit,
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
            podcaster: true,
            categories: {
              select: {
                category: true
              }
            }
          }
        },
        _count: {
          select: {
            recentlyPlayed: true
          }
        }
      },
      orderBy: {
        trackNumber: "asc"
      }
    });

    const mappedTracks = await Promise.all(
      TrackResource.cardCollection(tracks, lang).map(async (track) => {
        const playlistTracks = await prisma.playlistTrack.findMany({
          where: {
            trackId: track.id,
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

        return {
          ...track,
          isAddedToPlaylist: playlistTracks.length > 0,
          ...(playlistTracks.length > 0 && {
            playlist: playlistTracks.map(item => ({
              id: item.playlist.id,
              name: item.playlist.title
            }))
          })
        };
      })
    );

    return {
      records: mappedTracks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getAlbumDetails(albumId, customerId, lang) {
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        deletedAt: null,
        status: "PUBLISHED"
      },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        coverImage: true,
        podcaster: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        tracks: {
          where: {
            deletedAt: null,
            status: "PUBLISHED"
          },
          select: {
            id: true,
            title: true,
            description: true,
            trackNumber: true,
            durationSeconds: true,
            isExplicit: true,
          }
        }
      }
    });

    if (!album) {
      throw new HttpError(404, "ALBUM_NOT_FOUND", "album not found", "album");
    }

    const likesCount = await prisma.like.count({
      where: {
        entityId: albumId,
        entityType: 'ALBUM',
        type: 'LIKE'
      }
    });

    const dislikesCount = await prisma.like.count({
      where: {
        entityId: albumId,
        entityType: 'ALBUM',
        type: 'DISLIKE'
      }
    });

    const userReaction = customerId
      ? await prisma.like.findFirst({
        where: {
          customerId,
          entityId: albumId,
          entityType: 'ALBUM'
        }
      })
      : null;

      // Check album in library
      const library = await prisma.library.findFirst({
          where: {
              customerId,
              entityId: album.id,
              entityType: "ALBUM"
          },
          select: {
            id: true
          }
      });

    return {
      id: album.id,
      slug: album.slug,
      type: album.type,

      title: album?.title,
      description: album?.description,
      isExplicit: album.isExplicit,

      categories: album.categories.map(ac => ({
        id: ac.category.id,
        name: ac.category.name
      })),

      coverImage: album.coverImage?.cdnUrl || null,

      totalDuration: Math.ceil(album.totalDuration / 60),

      createdAt: album.createdAt,

      totalTracks: album.tracks.length,

      podcaster: {
        id: album.podcaster.id,
        name: album.podcaster.name,
        profileImage: album.podcaster.profileImage
      },

      likeDislike: {
        likesCount,
        dislikesCount,
        isLiked: userReaction?.type === 'LIKE',
        isDisliked: userReaction?.type === 'DISLIKE'
      },

      download: {
        isDownloaded: false
      },

      library: {
        isInLibrary: !!library
      },

      playlist: []
    };
  }
}

export default new AlbumService();