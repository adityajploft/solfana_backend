// album.service.js
import prisma from '../../../config/db.config.js';
import redis from '../../../config/redis.config.js'
import dayjs from "dayjs";

import { checkPremiumSubscription } from '../../../common/utils/helper.js';
import TrackResource from '../resources/track.resource.js';
import { getTracksByIds, getTrackAdditionalData } from '../../../common/utils/helper.js';
import { config } from "../../../config/index.js"
import HttpError from '../../../common/errors/http.error.js';

const BASE_LIMIT = config("constants.base_limit_sec");
const AD_REWARD = config("constants.ad_reward_sec");
const MAX_ADS = config("constants.max_ads");
const LIMIT = config("constants.queue_cursor_limit");

class TrackAnalyticsService {

    static getRedisKey(customerId) {
        const date = dayjs().format("YYYY-MM-DD");
        return `usage:${customerId}:${date}`;
    }

    static getToday() {
        return dayjs().startOf("day").toDate();
    }

    static getNextAction({ remaining, adsWatchedCount }) {        
        if (remaining > 60) return "NONE";

        if (remaining > 0) return "WARNING";

        if (remaining <= 0 && adsWatchedCount < MAX_ADS) {
            return "SHOW_REWARDED_AD";
        }

        return "SHOW_UPGRADE";
    }

    static async getOrInitUsage(customerId) {
        const key = TrackAnalyticsService.getRedisKey(customerId);

        let usage = await redis.get(key);
        if (usage) return JSON.parse(usage);

        // fallback DB
        let dbUsage = await prisma.customerDailyUsage.findUnique({
            where: {
                customerId_date: {
                    customerId,
                    date: TrackAnalyticsService.getToday()
                }
            }
        });

        if (!dbUsage) {
            dbUsage = await prisma.customerDailyUsage.create({
                data: {
                    customerId,
                    date: TrackAnalyticsService.getToday(),
                    totalAllowedSeconds: BASE_LIMIT
                }
            });
        }

        const redisData = {
            listenedSeconds: Number(dbUsage.listenedSeconds || 0),
            rewardedSeconds: Number(dbUsage.rewardedSeconds || 0),
            adsWatchedCount: Number(dbUsage.adsWatchedCount || 0)
        };

        const ttl = dayjs().endOf("day").diff(dayjs(), "second");
        await redis.set(key, JSON.stringify(redisData), "EX", ttl);

        return redisData;
    }

    static calculateLimits(usage, isPremium) {
        if (isPremium) {
            return {
                totalLimit: Infinity,
                remaining: Infinity
            };
        }

        const totalLimit = BASE_LIMIT + usage.rewardedSeconds;
        const remaining = Math.max(0, totalLimit - usage.listenedSeconds);

        return { totalLimit, remaining };
    }

    // Start
    async startListening(customerId, trackId) {
        const isPremium = await checkPremiumSubscription(customerId);

        let usage = await TrackAnalyticsService.getOrInitUsage(customerId);
        const { totalLimit } = TrackAnalyticsService.calculateLimits(usage, isPremium);

        // Recently Played (UPSERT)
        let session = null;
        if (trackId) {
            await prisma.recentlyPlayed.upsert({
                where: {
                    customerId_trackId: { customerId, trackId }
                },
                update: {
                    lastPlayedAt: new Date()
                },
                create: {
                    customerId,
                    trackId,
                    lastPlayedAt: new Date(),
                    lastPositionSec: 0
                }
            });

            session = await prisma.trackListenSession.create({
                data: {
                    customerId,
                    trackId,
                    startedAt: new Date(),
                    lastActiveAt: new Date()
                }
            });
        }

        const updatedRemaining = isPremium ? Infinity : Math.max(0, totalLimit - usage.listenedSeconds);
        const nextAction = isPremium ? "NONE" : TrackAnalyticsService.getNextAction({ remaining: updatedRemaining, adsWatchedCount: usage.adsWatchedCount});

        return {
            sessionId: session?.id || null,
            isPremium,
            remainingSeconds: updatedRemaining,
            totalLimitSeconds: totalLimit,
            canPlay: isPremium || updatedRemaining > 0,
            nextAction : nextAction,
            ads: {
                watchedCount: usage.adsWatchedCount,
                canWatchAd: usage.adsWatchedCount < MAX_ADS
            }
        };
    }

    // Progress
    async updateProgress(customerId, payload) {
        const { trackId, consumedSeconds, currentPositionSec, sessionId } = payload;

        const isPremium = await checkPremiumSubscription(customerId);
        let usage = await TrackAnalyticsService.getOrInitUsage(customerId);

        const { totalLimit, remaining } = TrackAnalyticsService.calculateLimits(usage, isPremium);

        let allowed = isPremium ? consumedSeconds : Math.min(consumedSeconds, remaining);

        // Update usage
        usage.listenedSeconds += allowed;

        await redis.set(
            TrackAnalyticsService.getRedisKey(customerId),
            JSON.stringify(usage),
            "EX",
            dayjs().endOf("day").diff(dayjs(), "second")
        );

        const today = TrackAnalyticsService.getToday();

        await prisma.customerDailyUsage.upsert({
            where: { customerId_date: { customerId, date: today } },
            update: { listenedSeconds: usage.listenedSeconds },
            create: {
                customerId,
                date: today,
                listenedSeconds: usage.listenedSeconds,
                rewardedSeconds: usage.rewardedSeconds,
                adsWatchedCount: usage.adsWatchedCount,
                totalAllowedSeconds: BASE_LIMIT
            }
        });

        // Session update
        let activeSessionId = sessionId;
        if (trackId) {
            if (sessionId) {
                const session = await prisma.trackListenSession.findUnique({
                    where: { id: sessionId }
                });

                if (!session || session.trackId !== trackId) {
                    const newSession = await prisma.trackListenSession.create({
                        data: {
                            customerId,
                            trackId,
                            startedAt: new Date(),
                            lastActiveAt: new Date()
                        }
                    });
                    activeSessionId = newSession.id;
                }
            } else {
                const newSession = await prisma.trackListenSession.create({
                    data: {
                        customerId,
                        trackId,
                        startedAt: new Date(),
                        lastActiveAt: new Date()
                    }
                });
                activeSessionId = newSession.id;
            }
        }

        if (activeSessionId && trackId) {
            const track = await prisma.track.findUnique({
                where: { id: trackId },
                select: { durationSeconds: true }
            });

            const updateData = {
                totalListenedSec: { increment: allowed },
                lastActiveAt: new Date()
            };

            if (track && currentPositionSec >= track.durationSeconds) {
                updateData.isCompleted = true;
                updateData.completionRate = Math.min(
                    100,
                    (currentPositionSec / track.durationSeconds) * 100
                );
                updateData.endedAt = new Date();
            }

            await prisma.trackListenSession.update({
                where: { id: activeSessionId },
                data: updateData
            });
        }

        if (trackId) {
            // PLAY COUNT (only once per user/day/track)
            const playKey = `track_played:${trackId}:${customerId}:${dayjs().format("YYYY-MM-DD")}`;
            const isFirstPlay = await redis.set(playKey, 1, "NX", "EX", 86400);

            if (isFirstPlay) {
                await prisma.trackAnalytics.upsert({
                    where: { trackId_date: { trackId, date: today } },
                    update: {
                        totalPlays: { increment: 1 }
                    },
                    create: {
                        trackId,
                        date: today,
                        totalPlays: 1,
                        totalListenSec: 0,
                        uniqueListeners: 0
                    }
                });

                // ✅ USER TRACK COUNT
                await prisma.userAnalytics.upsert({
                    where: { customerId_date: { customerId, date: today } },
                    update: {
                        totalTracks: { increment: 1 }
                    },
                    create: {
                        customerId,
                        date: today,
                        totalTracks: 1,
                        totalListenSec: 0,
                        adsWatched: 0
                    }
                });
            }

            // ✅ UNIQUE LISTENER
            const uniqueKey = `track_unique:${trackId}:${dayjs().format("YYYY-MM-DD")}`;
            const isNew = await redis.sadd(uniqueKey, customerId);

            if (isNew === 1) {
                await prisma.trackAnalytics.update({
                    where: { trackId_date: { trackId, date: today } },
                    data: {
                        uniqueListeners: { increment: 1 }
                    }
                });
            }

            // ✅ LISTEN TIME
            if (allowed > 0) {
                await prisma.trackAnalytics.upsert({
                    where: { trackId_date: { trackId, date: today } },
                    update: {
                        totalListenSec: { increment: allowed }
                    },
                    create: {
                        trackId,
                        date: today,
                        totalListenSec: allowed,
                        totalPlays: 0,
                        uniqueListeners: 0
                    }
                });

                await prisma.userAnalytics.upsert({
                    where: { customerId_date: { customerId, date: today } },
                    update: {
                        totalListenSec: { increment: allowed }
                    },
                    create: {
                        customerId,
                        date: today,
                        totalListenSec: allowed,
                        totalTracks: 0,
                        adsWatched: 0
                    }
                });
            }
        }

        const updatedRemaining = isPremium ? Infinity : Math.max(0, totalLimit - usage.listenedSeconds);
        const nextAction = isPremium ? "NONE" : TrackAnalyticsService.getNextAction({ remaining: updatedRemaining, adsWatchedCount: usage.adsWatchedCount});

        return {
            sessionId: activeSessionId,
            isPremium,
            consumedSeconds: allowed,
            remainingSeconds: updatedRemaining,
            canPlay: isPremium || updatedRemaining > 0,
            nextAction,
            ads: {
                watchedCount: usage.adsWatchedCount,
                canWatchAd: usage.adsWatchedCount < MAX_ADS
            }
        };
    }

    // Status
    async getStatus(customerId) {
        const isPremium = await checkPremiumSubscription(customerId);

        const usage = await TrackAnalyticsService.getOrInitUsage(customerId);

        const { totalLimit, remaining } = TrackAnalyticsService.calculateLimits(usage, isPremium);

        const nextAction = isPremium ? "NONE" : TrackAnalyticsService.getNextAction({remaining, adsWatchedCount: usage.adsWatchedCount});

        return {
            isPremium,
            remainingSeconds: remaining,
            totalLimitSeconds: totalLimit,
            canPlay: isPremium || remaining > 0,
            nextAction,
            ads: {
                watchedCount: usage.adsWatchedCount,
                canWatchAd: usage.adsWatchedCount < MAX_ADS
            }
        };
    }

    // AD REWARD
    async rewardAd(customerId) {
        const isPremium = await checkPremiumSubscription(customerId);
        if (isPremium) {
            throw new HttpError(400, 'PREMIUM_USER', 'premium_user', 'track-analytics');
        }

        const usage = await TrackAnalyticsService.getOrInitUsage(customerId);

        const { totalLimit, remaining } = TrackAnalyticsService.calculateLimits(usage, false);

        if (remaining > 0) {
            throw new HttpError(400, 'AD_NOT_ALLOWED', 'ad_not_allowed', 'track-analytics');
        }

        if (usage.adsWatchedCount >= MAX_ADS) {
            throw new HttpError(400, 'ADS_LIMIT_REACHED', 'ads_limit_reached', 'track-analytics');
        }

        usage.rewardedSeconds += AD_REWARD;
        usage.adsWatchedCount += 1;

        const key = TrackAnalyticsService.getRedisKey(customerId)
        const ttl = dayjs().endOf("day").diff(dayjs(), "second");
        await redis.set(key, JSON.stringify(usage), "EX", ttl);

        // Update DB
        const today = TrackAnalyticsService.getToday();
        await prisma.customerDailyUsage.upsert({
            where: {
                customerId_date: {
                customerId,
                date: today
                }
            },
            update: {
                listenedSeconds: usage.listenedSeconds,
                rewardedSeconds: usage.rewardedSeconds,
                adsWatchedCount: usage.adsWatchedCount
            },
            create: {
                customerId,
                date: today,
                listenedSeconds: usage.listenedSeconds,
                rewardedSeconds: usage.rewardedSeconds,
                adsWatchedCount: usage.adsWatchedCount,
                totalAllowedSeconds: BASE_LIMIT
            }
        });

        const newTotal = BASE_LIMIT + usage.rewardedSeconds;
        const newRemaining = Math.max(0, newTotal - usage.listenedSeconds);
        const nextAction = TrackAnalyticsService.getNextAction({
            remaining: newRemaining,
            adsWatchedCount: usage.adsWatchedCount
        });

        await prisma.userAnalytics.upsert({
            where: {
                customerId_date: {
                    customerId,
                    date: today
                }
            },
            update: {
                adsWatched: { increment: 1 }
            },
            create: {
                customerId,
                date: today,
                adsWatched: 1
            }
        });

        return {
            rewardGrantedSeconds: AD_REWARD,
            totalLimitSeconds: BASE_LIMIT + usage.rewardedSeconds,
            remainingSeconds: Math.max(0, BASE_LIMIT + usage.rewardedSeconds - usage.listenedSeconds),
            nextAction,
            ads: {
                watchedCount: usage.adsWatchedCount,
                canWatchAd: usage.adsWatchedCount < MAX_ADS
            }
        };
    }

    // Play and Queue Helpers
    static async mapTrack(track, {userId, lang}) {
        const trackExtraData = await getTrackAdditionalData(track.id, userId);
        const trackResource = await new TrackResource(track, lang).details(trackExtraData);
        return {
            ...trackResource,
            isAddedToPlaylist: trackExtraData.isAddedToPlaylist,
            ...(trackExtraData.isAddedToPlaylist && { playlist: trackExtraData.playlist })
        };
    }

    static async getSourceTracks({ source, sourceId, userId, skip = 0, take = LIMIT }) {
        const trackInclude = {
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
        };
        switch (source) {
            case "album":
                return prisma.track.findMany({
                    where: {
                        albumId: sourceId,
                        status: "PUBLISHED"
                    },
                    include: trackInclude,
                    orderBy: { trackNumber: "asc" },
                    skip,
                    take
                });

            case "playlist":
                const playlistTracks = await prisma.playlistTrack.findMany({
                    where: {
                        playlistId: sourceId,
                        track: {
                            status: "PUBLISHED"
                        }
                    },
                    include: {
                        track: {
                            include: trackInclude
                        }
                    },
                    orderBy: { createdAt: "asc" },
                    skip,
                    take
                });

                return playlistTracks.map(pt => pt.track);

            case "like":
                const likes = await prisma.like.findMany({
                    where: {
                        customerId: userId,
                        entityType: "TRACK"
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take
                });

                return getTracksByIds(likes.map(l => l.entityId));

            case "favorite":
                const favs = await prisma.favorite.findMany({
                    where: {
                        customerId: userId,
                        entityType: "TRACK"
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take
                });

                return getTracksByIds(favs.map(f => f.entityId));

            case "library":
                const libs = await prisma.library.findMany({
                    where: {
                        customerId: userId,
                        entityType: "TRACK"
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take
                });

                return getTracksByIds(libs.map(l => l.entityId));

            case "recent":
                const recents = await prisma.recentlyPlayed.findMany({
                    where: { customerId: userId },
                    orderBy: { lastPlayedAt: "desc" },
                    skip,
                    take
                });

                return getTracksByIds(recents.map(r => r.trackId));

            case "single":
                return prisma.track.findMany({
                    where: {
                        id: sourceId,
                        status: "PUBLISHED"
                    },
                    include: trackInclude
                });
            default:

            throw new HttpError(400, 'INVALID_SOURCE', 'invalid_source', 'track-analytics');
        }
    }

    static async getTrackPosition({ source, sourceId, userId, trackId }) {
        switch (source) {
            case "album": {
                // Album mein tracks trackNumber se ordered hain
                // Bas count karo kitne tracks pehle aate hain
                const position = await prisma.track.count({
                    where: {
                        albumId: sourceId,
                        status: "PUBLISHED",
                        trackNumber: {
                            lt: (await prisma.track.findUnique({
                                where: { id: trackId },
                                select: { trackNumber: true }
                            })).trackNumber
                        }
                    }
                });
                return position;
            }

            case "playlist": {
                const playlistTracks = await prisma.playlistTrack.findMany({
                    where: {
                        playlistId: sourceId,
                        track: { status: "PUBLISHED" }
                    },
                    select: { trackId: true },
                    orderBy: { createdAt: "asc" }
                });

                return playlistTracks.findIndex(pt => pt.trackId === trackId);
            }

            case "like": {
                const likes = await prisma.like.findMany({
                    where: {
                        customerId: userId,
                        entityType: "TRACK"
                    },
                    select: { entityId: true },
                    orderBy: { createdAt: "desc" }
                });

                return likes.findIndex(l => l.entityId === trackId);
            }

            case "favorite": {
                const favs = await prisma.favorite.findMany({
                    where: {
                        customerId: userId,
                        entityType: "TRACK"
                    },
                    select: { entityId: true },
                    orderBy: { createdAt: "desc" }
                });

                return favs.findIndex(f => f.entityId === trackId);
            }

            case "library": {
                const libs = await prisma.library.findMany({
                    where: {
                        customerId: userId,
                        entityType: "TRACK"
                    },
                    select: { entityId: true },
                    orderBy: { createdAt: "desc" }
                });

                return libs.findIndex(l => l.entityId === trackId);
            }

            case "recent": {
                const recents = await prisma.recentlyPlayed.findMany({
                    where: { customerId: userId },
                    select: { trackId: true },
                    orderBy: { lastPlayedAt: "desc" }
                });

                return recents.findIndex(r => r.trackId === trackId);
            }

            case "single":
                return 0;

            default:
                throw new HttpError(400, 'INVALID_SOURCE', 'invalid_source', 'track-analytics');
        }
    }

    // Play Track
    async playTrack({ trackId, source, sourceId, userId }, lang) {
        // find index first (cheap way)
        const index = await TrackAnalyticsService.getTrackPosition({source, sourceId, userId, trackId});

        if (index === -1) throw new HttpError(404, 'TRACK_NOT_FOUND_SOURCE', 'track_not_found_source', 'track-analytics');

        const start = Math.max(index - 10, 0);

        const tracks = await TrackAnalyticsService.getSourceTracks({source, sourceId, userId, skip: start, take: LIMIT});

        const updatedTracks = await Promise.all(
            tracks.map(track => TrackAnalyticsService.mapTrack(track, {userId, lang}))
        );

        return {
            queue: updatedTracks,
            currentIndex: index - start,
            nextCursor: start + LIMIT,
            prevCursor: start,
            source,
            sourceId
        };
    }

    // NEXT CHUNK
    async getNext({cursor, source, sourceId, userId}, lang) {
        const tracks = await TrackAnalyticsService.getSourceTracks({source, sourceId, userId, skip: Number(cursor), take: LIMIT});

        const updatedTracks = await Promise.all(
            tracks.map(track => TrackAnalyticsService.mapTrack(track, {userId, lang}))
        );

        return {
            queue: updatedTracks,
            nextCursor: Number(cursor) + LIMIT
        };
    }

    // PREVIOUS CHUNK
    async getPrev({cursor, source, sourceId, userId }, lang) {

        const skip = Math.max(Number(cursor) - LIMIT, 0);

        const tracks = await TrackAnalyticsService.getSourceTracks({source, sourceId, userId, skip, take: LIMIT });

        const updatedTracks = await Promise.all(
            tracks.map(track => TrackAnalyticsService.mapTrack(track, {userId, lang}))
        );

        return {
            queue: updatedTracks,
            prevCursor: skip
        };
    }
}

export default new TrackAnalyticsService();