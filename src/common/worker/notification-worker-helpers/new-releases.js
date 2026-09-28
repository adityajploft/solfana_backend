import prisma from "../../../config/db.config.js";
import { createNotification } from "../../services/notifications/notificationService.js";

export async function newReleaseNotificationHelper(job) {
    const { contentId, type } = job.data;

    let album;
    let track;

    // FETCH DATA BASED ON TYPE
    if (type === 'album') {
        album = await prisma.album.findUnique({
            where: { id: contentId },
            include: { podcaster: true, categories: true }
        });

        if (!album) return;
    }

    if (type === 'track') {
        track = await prisma.track.findUnique({
            where: { id: contentId },
            include: {
                album: {
                    include: {
                        podcaster: true,
                        categories: true
                    }
                }
            }
        });

        if (!track) return;

        album = track.album; // reuse album for targeting
    }

    // COMMON DATA
    const albumTitle = album?.title || 'New Album';    
    const trackTitle = track?.title || '';
    const podcasterName = album.podcaster?.name || '';

    // TARGET USERS (followers + interests)
    const followers = await prisma.customerFollowPodcaster.findMany({
        where: { podcasterId: album.podcasterId },
        select: { customer: { select: { id: true, language: { select: { lang: true } }, fcmToken: true } } },
    });

    const categoryIds = album.categories.map(c => c.categoryId);

    const interestedUsers = await prisma.customerInterest.findMany({
        where: { category_id: { in: categoryIds } },
        select: { customer: { select: { id: true, language: { select: { lang: true } }, fcmToken: true, } } },
    });

    // DEDUP USERS
    const userMap = new Map();

    [...followers, ...interestedUsers].forEach((item) => {
    if (item.customer) {
        userMap.set(item.customer.id, item.customer);
    }
    });

    const customers = Array.from(userMap.values());

    console.log(`Total customers: ${customers.length}`);

    // BATCH PROCESSING
    const batchSize = 100;
    for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);

        await Promise.all(
            batch.map(async (customer) => {
                console.log(`Notification Send: ${customer.id}`);

                await createNotification({
                    receiverId: customer.id,
                    receiverType: 'CUSTOMER',

                    notificationKey: 'new_releases',

                    moduleType: type,
                    moduleId: contentId,

                    isClickable: true,
                    clickAction: 'OPEN_SCREEN',
                    clickValue: type === 'album' ? `ALBUM_DETAILS` : `TRACK_DETAILS`,

                    lang: customer.language?.lang || 'fr',

                    data: {
                        type: type,
                        albumName: albumTitle,
                        podcasterName,
                            ...(type === 'track' && {
                                trackName: trackTitle,
                        }),
                    },

                    fcmToken: customer.fcmToken,
                });
            })
        );
    }
}