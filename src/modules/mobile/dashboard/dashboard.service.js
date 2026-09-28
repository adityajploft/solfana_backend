import prisma from '../../../config/db.config.js';
import AlbumResource from '../resources/album.resource.js';
import CategoryResource from '../resources/category.resource.js';
import PodcasterResource from '../resources/podcaster.resource.js';
import PlaylistResource from '../resources/playlist.resourse.js';
import TrackResource from '../resources/track.resource.js';
import { buildRecommendedAlbums, buildExploreAlbums, getBestAlbums } from '../../../common/utils/analytics.helper.js';

class CustomerDashboardService {

  async getDashboard(customerId, lang, type) {
    let genres, audiobooks = [], bestPodcasts = [], podcasters = [], recommended = [], playlist = [];

    // Basic Data
    const [customer] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: { languageId: true }
      }),
    ]);

    const languageId = customer?.languageId || 1;

    const recentlyPlayedData = await this.getRecentlyPlayed(customerId, 1, 10, languageId);

    // Genres
    genres = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: { id: true, name: true, bgColor1: true, bgColor2: true, gradientText: true, translations: { where: { languageId }, select: { name: true } } },
      orderBy: { position: 'asc' },
      take: 10
    });
    genres = await CategoryResource.cardCollection(genres);

    // Recommended    
    const recommendedData = await buildRecommendedAlbums({customerId, languageId, type, limit: 10 });
    recommended = AlbumResource.cardCollection(recommendedData.data);

    // Podcast Section
    if (type !== "audiobook") {
      // Best Podcasts
      bestPodcasts = await getBestAlbums("PODCAST", languageId, 10);

      // Podcaster List
      podcasters = await prisma.user.findMany({
        where: { roleId: 4 },
        select: { id: true, name: true },
        take: 10
      });
      podcasters = await PodcasterResource.cardCollection(podcasters);
    }

    // Audiobook
    if (type !== "podcast") {
      // Best AudioBooks
      audiobooks = await prisma.album.findMany({
        where: { type: "AUDIOBOOK", status: "PUBLISHED", deletedAt: null },
        select: { id: true, title: true, description: true, isExplicit: true,
          coverImage: { select: { cdnUrl: true } },
          podcaster: { select: { name: true } }
        },
        take: 10
      });
      audiobooks = AlbumResource.cardCollection(audiobooks);
    }

    // Playlist
    playlist = await prisma.playlist.findMany({
      where: { customerId, deletedAt: null },
      include: { _count: { select: { tracks: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    playlist = await PlaylistResource.cardCollection(playlist);


    // AUDIBLE ORIGINAL
    const audibleOriginalAlbums = await prisma.album.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { id: true, title: true, description: true, publishedAt: true, createdAt: true, isExplicit: true,
        coverImage: { select: { cdnUrl: true } },
        podcaster: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    const audibleOriginal = AlbumResource.cardCollection(audibleOriginalAlbums).map((item, i) => ({
      ...item,
      publishedAt: audibleOriginalAlbums[i]?.publishedAt,
      createdAt: audibleOriginalAlbums[i]?.createdAt
    }));

    // NEW RELEASE
    let newRelease = [];
    if (["audiobook", "podcast"].includes(type)) {
      const latestRelease = await prisma.album.findMany({
        where: { type: type.toUpperCase(), status: "PUBLISHED", deletedAt: null },
        select: { id: true, title: true, description: true, isExplicit: true,
          coverImage: { select: { cdnUrl: true } },
          podcaster: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      });

      newRelease = AlbumResource.cardCollection(latestRelease);
    }


    // RESPONSE
    let response = {
      genres,
      recently_played: recentlyPlayedData?.records,
      audible_original: audibleOriginal,
      playlist
    };

    if (["all", "audiobook"].includes(type)) {
      response.audiobooks = audiobooks;
      response.recommended_for_you = recommended;
    }

    if (["all", "podcast"].includes(type)) {
      response.best_podcasts = bestPodcasts;
      response.podcasters = podcasters;
      response.recommended_for_you = recommended;
    }

    if (type === "podcast") {
      const exploreData = await buildExploreAlbums({ type: "PODCAST", languageId, limit: 6 });
      response.explore = AlbumResource.cardCollection(exploreData.data);
    }

    if (["audiobook", "podcast"].includes(type)) {
      response.new_release = newRelease;
    }

    return response;
  }

  // See All - Podcasters with Pagination
  async getPodcasters(page = 1, limit = 10, languageId = 1, search) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = {
      roleId: 4,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      })
    };

    const [podcasters, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.user.count({
        where
      })
    ]);

    const formattedPodcasters = await PodcasterResource.cardCollection(podcasters);

    return {
      records: formattedPodcasters,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // See All - Best Podcasts with Pagination
  async getBestPodcasts(page = 1, limit = 10, languageId = 1, search) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = { type: "PODCAST", status: "PUBLISHED", deletedAt: null,
      ...(typeof search === "string" && search.trim() && {
        title: { contains: search.trim(), mode: "insensitive"}
      })
    };

    const [podcasts, total] = await Promise.all([
      prisma.album.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          isExplicit: true,
          coverImage: {
            select: {
              cdnUrl: true
            }
          },
          podcaster: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.album.count({
        where
      })
    ]);

    const formattedPodcasts = AlbumResource.cardCollection(podcasts);

    return {
      records: formattedPodcasts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // See All - Audiobooks with Pagination
  async getAudiobooks(page = 1, limit = 10, languageId = 1, search) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = { type: "AUDIOBOOK", status: "PUBLISHED", deletedAt: null, 
      ...(typeof search === "string" && search.trim() && {
        title: { contains: search.trim(), mode: "insensitive" }
      })
    };

    const [audiobooks, total] = await Promise.all([
      prisma.album.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          isExplicit: true,

          coverImage: {
            select: {
              cdnUrl: true
            }
          },
          podcaster: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.album.count({
        where
      })
    ]);

    const formattedAudiobooks = AlbumResource.cardCollection(audiobooks);

    return {
      records: formattedAudiobooks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // See All - Recommended For You with Pagination
  async getRecommendedForYou(customerId, page = 1, limit = 10, languageId = 1, search) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const recommendedData = await buildRecommendedAlbums({customerId, languageId, search, limit, skip, paginate: true});

    const formattedRecommended = AlbumResource.cardCollection(recommendedData.data);

    return {
      records: formattedRecommended,
      pagination: {
        total: recommendedData.total,
        page,
        limit,
        pages: Math.ceil(recommendedData.total / limit)
      }
    };
  }

  // See All - Genres with Pagination
  async getGenres(type = null, page = 1, limit = 10, languageId = 1, search) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    let whereCondition = {
      isActive: true,
      parentId: null,
      ...(search && {
        translations: {
          some: {
            languageId,
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      })
    };

    if (type === 'audiobook') {
      whereCondition.type = "AUDIOBOOK";
    } else if (type === 'podcast') {
      whereCondition.type = "PODCAST";
    }

    const [genres, total] = await Promise.all([
      prisma.category.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
          bgColor1: true,
          bgColor2: true,
          gradientText: true,
          translations: {
            where: { languageId },
            select: { name: true }
          }
        },
        orderBy: { position: 'asc' },
        skip,
        take: limit
      }),
      prisma.category.count({
        where: whereCondition
      })
    ]);

    const formattedGenres = await CategoryResource.cardCollection(genres);

    return {
      records: formattedGenres,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }


  async getRecentlyPlayed(customerId, page = 1, limit = 10, languageId = 1) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const [recentTracks, total] = await Promise.all([
      prisma.recentlyPlayed.findMany({
        where: {
          customerId,
          track: {
            deletedAt: null,
            album: {
              deletedAt: null
            }
          }
        },
        include: {
          track: {
            include: {
              album: {
                include: {
                  coverImage: true,
                  podcaster: true
                }
              },
              audioLibrary: true
            }
          }
        },
        orderBy: {
          lastPlayedAt: "desc"
        },
        distinct: ["trackId"],
        skip,
        take: limit
      }),

      prisma.recentlyPlayed.count({
        where: {
          customerId
        }
      })
    ]);

    const tracks = recentTracks.map(item => item.track);

    let formattedTracks = TrackResource.cardCollection(tracks, languageId);

    formattedTracks = formattedTracks.map((track, index) => ({
      ...track,
      lastPlayedAt: recentTracks[index].lastPlayedAt,
      lastPositionSec: recentTracks[index].lastPositionSec
    }));

    return {
      records: formattedTracks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // See All Explore Podcasts/Audiobook
  async getExploreTrackAll(customerId, page = 1, limit = 10, languageId = 1, type) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const trackType = type == 'podcast' ? "PODCAST" : "AUDIOBOOK";

    const exploreData = await buildExploreAlbums({ type: trackType, languageId, limit: 10, skip, paginate: true });

    return {
      records: AlbumResource.cardCollection(exploreData.data),
      pagination: {
        total: exploreData.total,
        page,
        limit,
        pages: Math.ceil(exploreData.total / limit)
      }
    };
  }
}

export default new CustomerDashboardService();
