import prisma from "../../config/db.config.js";

export async function getUserProfileImage(user) {
  try {
    const profileImage = await prisma.upload.findFirst({
      where: {
        entityType: "USER",
        uploadType: "PROFILE_IMAGE",
        entityId: user.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        cdnUrl: true,
      },
    });

    if (!profileImage) return null;

    return profileImage.cdnUrl.startsWith("http")
      ? profileImage.cdnUrl
      : `https://${profileImage.cdnUrl}`;
  } catch (error) {
    console.error("Profile image fetch failed:", error.message);
    return null;
  }
}

export async function getCategoryImage(category, categortImageType = "CATEGORY_IMAGE") {
  try {
    const uploadMedia = await prisma.upload.findFirst({
      where: {
        entityType: "CATEGORY",
        uploadType: categortImageType,
        entityId: category.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        cdnUrl: true,
      },
    });

    if (!uploadMedia) return null;

    return uploadMedia.cdnUrl.startsWith("http") ? uploadMedia.cdnUrl : `https://${uploadMedia.cdnUrl}`;
  } catch (error) {
    console.error("Profile image fetch failed:", error.message);
    return null;
  }
}

export async function getPlaylistThumbnailImage(playlist) {
  try {
    // Fetch tracks with required relations
    const playlistWithTracks = await prisma.playlist.findUnique({
      where: { id: playlist.id },
      include: {
        tracks: {
          orderBy: { createdAt: "asc" }, // ensure consistent order
          include: {
            track: {
              include: {
                album: {
                  include: {
                    coverImage: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!playlistWithTracks || !playlistWithTracks.tracks.length) {
      return null;
    }

    // Iterate over tracks
    for (const pt of playlistWithTracks.tracks) {
      const track = pt.track;

      // 1. Check track cover image
      if (track?.coverImage) {
        return track.coverImage.startsWith("http") ? track.coverImage : `https://${track.coverImage}`
      }

      // 2. Check album cover image
      const albumCover = track?.album?.coverImage?.cdnUrl;
      if (albumCover) {
        return albumCover.startsWith("http") ? albumCover : `https://${albumCover}`;
      }
    }

    // 3. No image found
    return null;

  } catch (error) {
    console.error("Playlist thumbnail fetch failed:", error.message);
    return null;
  }
}

export async function checkPremiumSubscription(customerId) {
  const sub = await prisma.subscription.findFirst({
    where: {
      customerId,
      status: "ACTIVE",

      // ✅ Only PREMIUM plan
      plan: {
        code: "PREMIUM",
      },

      // ✅ Must be valid (not expired)
      endsAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return !!sub;
}

export async function getTrackAdditionalData(trackId, customerId) {
  const [favorite, library, playlistTracks, reactionsGrouped, userReaction] = await Promise.all([
    prisma.favorite.findFirst({
      where: {
        customerId,
        entityId: trackId,
        entityType: "TRACK"
      },
      select: { id: true }
    }),

    prisma.library.findFirst({
      where: {
        customerId,
        entityId: trackId,
        entityType: "TRACK"
      },
      select: { id: true }
    }),

    prisma.playlistTrack.findMany({
      where: {
        trackId,
        playlist: {
          customerId,
          deletedAt: null
        }
      },
      select: {
        playlist: {
          select: {
            id: true,
            title: true
          }
        }
      }
    }),

    prisma.like.groupBy({
      by: ["type"],
      where: {
        entityId: trackId,
        entityType: "TRACK"
      },
      _count: {
        type: true
      }
    }),

    prisma.like.findFirst({
      where: {
        customerId,
        entityId: trackId,
        entityType: "TRACK"
      },
      select: { type: true }
    })
  ]);

  let likesCount = 0;
  let dislikesCount = 0;

  for (const item of reactionsGrouped) {
    if (item.type === "LIKE") likesCount = item._count.type;
    if (item.type === "DISLIKE") dislikesCount = item._count.type;
  }

  return {
    isAddedToFavourite: !!favorite,
    is_added_library: !!library,
    likesCount,
    dislikesCount,
    isLiked: userReaction?.type === "LIKE",
    isDisliked: userReaction?.type === "DISLIKE",

    // playlist
    isAddedToPlaylist: playlistTracks.length > 0,
    playlist: playlistTracks.length > 0 ? playlistTracks.map(item => ({ id: item.playlist.id, name: item.playlist.title })) : []
  };
}


export async function getTracksByIds(ids) {
  const tracks = await prisma.track.findMany({
    where: {
      id: { in: ids },
      status: "PUBLISHED"
    },
    include: {
      audioLibrary: true,
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
      }
    }
  });

  // maintain order
  const map = new Map(tracks.map(t => [t.id, t]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

export async function addFreeSubscriptionPlan(customer) {
  const freePlan = await prisma.subscriptionPlan.findFirst({
    where: {
      code: 'FREE',
      isActive: true,
      deletedAt: null,
    },
  });
  if(freePlan){
    await prisma.subscription.create({
      data: {
        customerId: customer.id,
        planId: freePlan.id,
        startsAt: new Date(),
        endsAt: freePlan.durationDays
          ? new Date(Date.now() + freePlan.durationDays * 24 * 60 * 60 * 1000)
          : null,
        status: 'ACTIVE',
        source: 'MANUAL',
        planData: freePlan,
        userData: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          profileImage: customer.profileImage
        },
      },
    });
  }
}

export async function getAdminData() {
  const admin = await prisma.user.findFirst({
    where: { roleId: 1 },
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      fcmToken: true,
      languageId: true,
    },
    orderBy: { id: "asc" }
  });

  return admin;
}


export async function getSetting(key) {
  const setting = await prisma.setting.findUnique({ where: { key } });

  return setting;
}