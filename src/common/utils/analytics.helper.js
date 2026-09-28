import prisma from "../../config/db.config.js";
import AlbumResource from "../../modules/mobile/resources/album.resource.js";


// get customer recommended albums
export async function buildRecommendedAlbums({ customerId, languageId = 1, type = "all", search, limit = 10, skip = 0, paginate = false }) {

  const albumSelectFields = albumSelect();

  // -----------------------------
  // 1. USER SIGNALS
  // -----------------------------
  const [interests, followedPodcasters, listenedTracks] = await Promise.all([

    prisma.customerInterest.findMany({
      where: { customer_id: customerId },
      select: { category_id: true }
    }),

    prisma.customerFollowPodcaster.findMany({
      where: { customerId },
      select: { podcasterId: true }
    }),

    prisma.trackListenSession.findMany({
      where: { customerId },
      select: {
        track: {
          select: { albumId: true }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 50
    })

  ]);

  const interestCategoryIds = interests.map(i => i.category_id);
  const followedPodcasterIds = followedPodcasters.map(f => f.podcasterId);
  const listenedAlbumIds = [
    ...new Set(listenedTracks.map(t => t.track?.albumId).filter(Boolean))
  ];

  // -----------------------------
  // 2. BASE FILTER
  // -----------------------------
  const baseWhere = {
    status: "PUBLISHED",
    deletedAt: null,
    ...(type !== "all" && { type: type.toUpperCase() }),
    ...(search && {
      title: {
        contains: search,
        mode: "insensitive"
      }
    })
  };

  // -----------------------------
  // 3. FETCH 3 SOURCES
  // -----------------------------
  const [interestAlbums, historyAlbums, followAlbums] = await Promise.all([

    // Interest
    prisma.album.findMany({
      where: {
        ...baseWhere,
        ...(interestCategoryIds.length > 0 && {
          categories: {
            some: { categoryId: { in: interestCategoryIds } }
          }
        })
      },
      select: albumSelectFields,
      orderBy: { createdAt: 'desc' },
      take: limit * 2
    }),

    // History
    prisma.album.findMany({
      where: {
        ...baseWhere,
        id: { in: listenedAlbumIds.length ? listenedAlbumIds : [""] }
      },
      select: albumSelectFields,
      take: limit * 2
    }),

    // Follow
    prisma.album.findMany({
      where: {
        ...baseWhere,
        podcasterId: {
          in: followedPodcasterIds.length ? followedPodcasterIds : [""]
        }
      },
      select: albumSelectFields,
      orderBy: { createdAt: 'desc' },
      take: limit * 2
    })

  ]);

  // -----------------------------
  // 4. MERGE + DEDUPE
  // -----------------------------
  const uniqueMap = new Map();

  [...historyAlbums, ...followAlbums, ...interestAlbums].forEach(album => {
    if (!uniqueMap.has(album.id)) {
      uniqueMap.set(album.id, album);
    }
  });

  let result = Array.from(uniqueMap.values());

  const total = result.length;

  if (paginate) {
    result = result.slice(skip, skip + limit);
  } else {
    result = result.slice(0, limit);
  }

  return {
    data: result,
    total
  };
}

export async function buildExploreAlbums({type = "PODCAST", languageId = 1,   limit = 10, skip = 0, paginate = false }) {

  const albumSelectFields = albumSelect();

  // ----------------------------------------
  // 1. TRENDING (based on analytics)
  // ----------------------------------------
  let trendingAlbums = [];

  try {
    const trendingTracks = await prisma.trackAnalytics.findMany({
      orderBy: { totalPlays: 'desc' },
      take: limit * 3,
      select: { track: { select: { albumId: true } } }
    });

    const albumIds = [ ...new Set(trendingTracks.map(t => t.track?.albumId).filter(Boolean)) ];

    trendingAlbums = await prisma.album.findMany({
      where: { id: { in: albumIds }, type, status: "PUBLISHED", deletedAt: null }, select: albumSelectFields 
    });

  } catch (e) {
    // fallback if analytics empty
    trendingAlbums = await prisma.album.findMany({ where: { type, status: "PUBLISHED", deletedAt: null },
      select: albumSelectFields,
      orderBy: { createdAt: 'desc' },
      take: limit * 2
    });
  }

  // ----------------------------------------
  // 2. CATEGORY DIVERSITY (Explore feel)
  // ----------------------------------------
  const categoryAlbums = await prisma.album.findMany({
    where: { type, status: "PUBLISHED", deletedAt: null },
    select: { ...albumSelectFields, categories: { select: { categoryId: true } } },
    take: limit * 3
  });

  // Group by category (pick 1–2 per category)
  const categoryMap = new Map();

  categoryAlbums.forEach(album => {
    const categoryId = album.categories?.[0]?.categoryId;
    if (!categoryId) return;

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, []);
    }

    if (categoryMap.get(categoryId).length < 2) {
      categoryMap.get(categoryId).push(album);
    }
  });

  const categoryBased = Array.from(categoryMap.values()).flat();

  // ----------------------------------------
  // 3. MERGE + DEDUPE
  // ----------------------------------------
  const uniqueMap = new Map();

  [...trendingAlbums, ...categoryBased].forEach(album => {
    if (!uniqueMap.has(album.id)) {
      uniqueMap.set(album.id, album);
    }
  });

  let result = Array.from(uniqueMap.values());

  const total = result.length;

  if (paginate) {
    result = result.slice(skip, skip + limit);
  } else {
    result = result.slice(0, limit);
  }

  return {
    data: result,
    total
  };
}

export async function getBestAlbums(type = "PODCAST", languageId = 1, limit = 10) {
  const albumSelectFields = albumSelect();

  // ---------------------------------------
  // 1. TRACK ANALYTICS (TOP TRACKS)
  // ---------------------------------------
  const trackStats = await prisma.trackAnalytics.groupBy({
    by: ['trackId'],
    _sum: { totalPlays: true, totalListenSec: true },
    orderBy: { _sum: { totalPlays: 'desc' } },
    take: limit
  });

  const trackIds = trackStats.map(t => t.trackId);

  // ---------------------------------------
  // 2. GET TRACK -> ALBUM
  // ---------------------------------------
  const tracks = await prisma.track.findMany({
    where: { id: { in: trackIds } },
    select: { id: true, albumId: true }
  });

  const trackToAlbumMap = new Map();
  tracks.forEach(t => { trackToAlbumMap.set(t.id, t.albumId); });

  // ---------------------------------------
  // 3. AGGREGATE BY ALBUM
  // ---------------------------------------
  const albumScoreMap = new Map();

  trackStats.forEach(stat => {
    const albumId = trackToAlbumMap.get(stat.trackId);
    if (!albumId) return;

    const plays = stat._sum.totalPlays || 0;
    const listen = stat._sum.totalListenSec || 0;

    if (!albumScoreMap.has(albumId)) {
      albumScoreMap.set(albumId, {
        totalPlays: 0,
        totalListenSec: 0
      });
    }

    const current = albumScoreMap.get(albumId);
    current.totalPlays += plays;
    current.totalListenSec += listen;

    albumScoreMap.set(albumId, current);
  });

  // ---------------------------------------
  // 4. SORT ALBUMS BY SCORE
  // ---------------------------------------
  let sortedAlbumIds = Array.from(albumScoreMap.entries())
    .sort((a, b) => b[1].totalPlays - a[1].totalPlays)
    .map(([albumId]) => albumId);

  // ---------------------------------------
  // 5. FALLBACK ALBUMS
  // ---------------------------------------
  if (sortedAlbumIds.length < limit) {
    const remainingLimit = limit - sortedAlbumIds.length;

    const fallbackAlbums = await prisma.album.findMany({
      where: { type, status: "PUBLISHED", id: { notIn: sortedAlbumIds } },
      orderBy: { createdAt: 'desc' },
      take: remainingLimit,
      select: { id: true }
    });

    sortedAlbumIds.push(...fallbackAlbums.map(a => a.id));
  }

  // limit final records
  sortedAlbumIds = sortedAlbumIds.slice(0, limit);

  // ---------------------------------------
  // 6. FETCH ALBUMS
  // ---------------------------------------
  const albums = await prisma.album.findMany({
    where: { id: { in: sortedAlbumIds }, type, status: "PUBLISHED" },

    select: albumSelectFields
  });

  // ---------------------------------------
  // 7. PRESERVE ORDER
  // ---------------------------------------
  const albumMap = new Map();

  albums.forEach(album => { albumMap.set(album.id, album); });

  const orderedAlbums = sortedAlbumIds.map(id => albumMap.get(id)).filter(Boolean);

  return AlbumResource.cardCollection(orderedAlbums);
}

export async function buildPopularAlbumsByPodcaster({podcasterId, languageId = 1, limit = 10}) {

  const albumSelectFields = albumSelect();

  // ---------------------------------------
  // 1. GET PODCASTER ALBUMS
  // ---------------------------------------
  const albums = await prisma.album.findMany({
    where: {
      podcasterId,
      status: "PUBLISHED",
      deletedAt: null
    },
    select: { id: true }
  });

  const albumIds = albums.map(a => a.id);

  if (!albumIds.length) return [];

  // ---------------------------------------
  // 2. GET TRACKS
  // ---------------------------------------
  const tracks = await prisma.track.findMany({
    where: {
      albumId: { in: albumIds }
    },
    select: {
      id: true,
      albumId: true
    }
  });

  const trackIds = tracks.map(t => t.id);

  const trackToAlbumMap = new Map();
  tracks.forEach(t => trackToAlbumMap.set(t.id, t.albumId));

  // ---------------------------------------
  // 3. ANALYTICS
  // ---------------------------------------
  const stats = await prisma.trackAnalytics.groupBy({
    by: ['trackId'],
    where: {
      trackId: { in: trackIds }
    },
    _sum: {
      totalPlays: true,
      totalListenSec: true
    }
  });

  // ---------------------------------------
  // 4. AGGREGATE PER ALBUM
  // ---------------------------------------
  const albumScoreMap = new Map();

  stats.forEach(stat => {
    const albumId = trackToAlbumMap.get(stat.trackId);
    if (!albumId) return;

    const plays = stat._sum.totalPlays || 0;

    if (!albumScoreMap.has(albumId)) {
      albumScoreMap.set(albumId, 0);
    }

    albumScoreMap.set(albumId, albumScoreMap.get(albumId) + plays);
  });

  const sortedAlbumIds = Array.from(albumScoreMap.entries()).sort((a, b) => b[1] - a[1]).map(([albumId]) => albumId).slice(0, limit);

  // ---------------------------------------
  // 5. FETCH ALBUMS
  // ---------------------------------------
  const result = await prisma.album.findMany({
    where: { id: { in: sortedAlbumIds } },
    select: albumSelect()
  });

  // Preserve order
  const map = new Map(result.map(a => [a.id, a]));

  return sortedAlbumIds.map(id => map.get(id)).filter(Boolean);
}

export async function buildExploreMoreAlbums({ podcasterId, customerId, languageId = 1, limit = 10 }) {

  // ---------------------------------------
  // 1. GET PODCASTER CATEGORY IDS
  // ---------------------------------------
  const podcasterAlbums = await prisma.album.findMany({
    where: {
      podcasterId,
      status: "PUBLISHED",
      deletedAt: null
    },
    select: {
      id: true,
      categories: {
        select: { categoryId: true }
      }
    }
  });

  const categoryIds = [
    ...new Set(
      podcasterAlbums.flatMap(a => a.categories.map(c => c.categoryId))
    )
  ];

  // ---------------------------------------
  // 2. USER LISTEN BEHAVIOR (OPTIONAL BOOST)
  // ---------------------------------------
  const listenedTracks = await prisma.trackListenSession.findMany({
    where: { customerId },
    select: {
      track: {
        select: { albumId: true }
      }
    },
    take: 50
  });

  const listenedAlbumIds = [
    ...new Set(listenedTracks.map(t => t.track?.albumId).filter(Boolean))
  ];

  // ---------------------------------------
  // 3. SIMILAR CATEGORY ALBUMS
  // ---------------------------------------
  const similarAlbums = await prisma.album.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      // podcasterId: { not: podcasterId }, // get other podcaster data
      podcasterId: podcasterId,

      tracks: {
        some: {
          status: "PUBLISHED",
          deletedAt: null
        }
      },

      ...(categoryIds.length > 0 && {
        categories: {
          some: {
            categoryId: { in: categoryIds }
          }
        }
      })
    },
    select: albumSelect(),
    orderBy: { createdAt: 'desc' },
    take: limit * 2
  });

  let finalAlbums = similarAlbums;

  // ---------------------------------------
  // FALLBACK 1: POPULAR ALBUMS (if empty)
  // ---------------------------------------
  if (finalAlbums.length === 0) {
    const popular = await prisma.album.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        // podcasterId: { not: podcasterId }, // get other podcaster data
        podcasterId: podcasterId,
        tracks: {
          some: {
            status: "PUBLISHED",
            deletedAt: null
          }
        }
      },
      orderBy: {
        createdAt: "desc" // or any popularity metric you maintain
      },
      take: limit,
      select: albumSelect()
    });

    finalAlbums = popular;
  }

  // ---------------------------------------
  // FALLBACK 2: LATEST ALBUMS (if still empty)
  // ---------------------------------------
  if (finalAlbums.length === 0) {
    const latest = await prisma.album.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        tracks: {
          some: {
            status: "PUBLISHED",
            deletedAt: null
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      select: albumSelect()
    });

    finalAlbums = latest;
  }

  // ---------------------------------------
  // 4. BOOST BY USER HISTORY
  // ---------------------------------------
  const boosted = [...finalAlbums].sort((a, b) => {
    const aScore =
      (listenedAlbumIds.includes(a.id) ? 3 : 0) +
      (categoryIds.some(c => a.categories?.some(ac => ac.categoryId === c)) ? 2 : 0);

    const bScore =
      (listenedAlbumIds.includes(b.id) ? 3 : 0) +
      (categoryIds.some(c => b.categories?.some(ac => ac.categoryId === c)) ? 2 : 0);

    return bScore - aScore;
  });

  return boosted.slice(0, limit);
}

function albumSelect() {
  return {
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
    },
    tracks: {
      where: {
        status: "PUBLISHED",
        deletedAt: null
      },

      select: {
        id: true,
        title: true,
        description: true,
        trackNumber: true,
        isExplicit: true,
        durationSeconds: true,
        status: true,
        coverImage: true,
        scheduledAt: true,
        publishedAt: true,

        audioLibrary: {
          select: {
            originalName: true,
            cdnUrl: true
          }
        }
      }
    }
  };
}