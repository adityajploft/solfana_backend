import cron from "node-cron";
import prisma from "../../config/db.config.js";
import { AlbumStatus } from "@prisma/client";
import { notificationQueue } from "../queues/notification.queue.js";

export const startAlbumPublishCron = () => {

  cron.schedule("* * * * *", async () => {

    try {
        console.log("Running Album/Track Publish Cron Job at", new Date().toISOString());

      const now = new Date(Date.now());

      // Fetch albums to publish
      const albumsToPublish = await prisma.album.findMany({
        where: {
          status: AlbumStatus.SCHEDULED,
          publishAt: { lte: now },
          deletedAt: null
        },
        select: { id: true }
      });

      // Fetch tracks to publish
      const tracksToPublish = await prisma.track.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: now },
          deletedAt: null
        },
        select: { id: true }
      });

      if (!albumsToPublish.length && !tracksToPublish.length) {
        return;
      }

      // Publish albums
      if (albumsToPublish.length) {
        await prisma.album.updateMany({
          where: {
            id: { in: albumsToPublish.map(a => a.id) }
          },
          data: {
            status: AlbumStatus.PUBLISHED,
            publishedAt: now
          }
        });
      }

      if (tracksToPublish.length) {
        await prisma.track.updateMany({
          where: {
            id: { in: tracksToPublish.map(t => t.id) }
          },
          data: {
            status: "PUBLISHED",
            publishedAt: now
          }
        });
      }

      // Send New Release (Album) notification to Customer 
      for (const album of albumsToPublish) {
        console.log("albumId: ", album.id);
        
        await notificationQueue.add("new-content-published", { contentId: album.id, type: "album" });
      }

      // Send New Release (Track) notification to Customer 
      for (const track of tracksToPublish) {
        await notificationQueue.add("new-content-published", { contentId: track.id, type: "track" });
      }


    } catch (error) {

      console.error("Album/Track Publish Cron Error:", error);

    }

  });

};