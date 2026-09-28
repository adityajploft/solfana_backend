import dotenv from 'dotenv';
dotenv.config();

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import prisma from "../config/db.config.js";
import { generateUniqueAlbumSlug } from "../common/utils/generateUniqueSlug.js";
import axios from "axios";
import { parseBuffer } from "music-metadata";
import crypto from "crypto";

// CONFIG
const CSV_PATH = path.join(process.cwd(), "uploads/import-data/album_track_list-demo.csv");

const LANG = {
  en: 1,
  fr: 2,
};

// 🔥 CDN BASE URL (change this)
const CDN_BASE_URL = process.env.BUNNY_STORAGE_CDN_URL || "https://solfana-local-ankur.b-cdn.net";
const ADMIN_ID = "2bcf3ca5-3f73-47e8-a24b-736cdc5b9cc2";

async function importCSV() {
  const rows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        try {
          await processRows(rows);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}

async function getAudioMetadataFromCDN(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const metadata = await parseBuffer(buffer, "audio/mpeg");

    return {
      duration: Math.floor(metadata.format.duration || 0),
      size: buffer.length,
      mimeType: "audio/mpeg",
    };
  } catch (err) {
    console.log(`⚠️ Metadata fetch failed: ${url}`);
    return {
      duration: 0,
      size: 0,
      mimeType: "audio/mpeg",
    };
  }
}

async function getFileMetadataFromCDN(url) {
  try {
    const response = await axios.head(url);

    return {
      size: parseInt(response.headers["content-length"] || 0),
      mimeType: response.headers["content-type"] || "application/octet-stream",
    };
  } catch (err) {
    console.log(`⚠️ Failed to fetch metadata: ${url}`);
    return {
      size: 0,
      mimeType: "application/octet-stream",
    };
  }
}

async function processRows(rows) {
  const albumMap = new Map();
  const audioMap = new Map();
  const albumDurationMap = new Map(); // ✅ NEW

  const allAudio = await prisma.audioLibrary.findMany();
  allAudio.forEach((a) => {
    audioMap.set(a.originalName, a);
  });

  for (const row of rows) {
    try {
      const albumTitleEn = row["Album Title En"]?.trim();
      if (!albumTitleEn) continue;

      const slug = await generateUniqueAlbumSlug(albumTitleEn);
      let album = albumMap.get(albumTitleEn.toLowerCase());

      if (!album) {
        album = await prisma.album.findUnique({ where: { slug } });

        if (!album) {
          const podcaster = await prisma.user.findFirst({
            where: { name: row["Podcaster Name"] },
          });

          if (!podcaster) {
            console.log(`❌ Podcaster not found: ${row["Podcaster Name"]}`);
            continue;
          }

          album = await prisma.album.create({
            data: {
              slug,
              type: row["Album Type"] || "PODCAST",
              podcasterId: podcaster.id,
              createdBy: podcaster.id,
              status: "PUBLISHED"
            },
          });

          await prisma.albumTranslation.createMany({
            data: [
              {
                albumId: album.id,
                languageId: LANG.en,
                title: row["Album Title En"],
                description: row["Album Description En"],
                metaKeywords: row["Album Keywords"],
              },
              {
                albumId: album.id,
                languageId: LANG.fr,
                title: row["Album Title Fr"],
                description: row["Album Description Fr"],
                metaKeywords: row["Album Keywords"],
              },
            ],
          });

          // Album Cover Image URL
          let coverImageUrl = null;
          let storagePath = null;
          if (row["Album Cover Image"]) {
            coverImageUrl = `${CDN_BASE_URL}/ALBUM/COVER_IMAGE/${row["Album Cover Image"]}`;
            storagePath = `ALBUM/COVER_IMAGE/${row["Album Cover Image"]}`;            

            const meta = await getFileMetadataFromCDN(coverImageUrl);            
            const albumCoverUploaded = await prisma.upload.create({
              data: {
                filename: path.basename(storagePath),
                originalName: row["Album Cover Image"],
                filepath: storagePath,
                mimetype: meta.mimeType,
                size: meta.size,
                uploadType: "COVER_IMAGE",
                entityType: "ALBUM",
                entityId : album.id,
                cdnUrl: coverImageUrl,
                storagePath,
                alt: null,
                description : null,
              },
            });

            // update album table
            await prisma.album.update({
                where: { id: album.id },
                data: { coverImageId: albumCoverUploaded.id },
            });
          }         

          // Categories
          const categories = row["Category Names"]?.split(",").map((c) => c.trim());
          if (categories?.length) {
            for (const catName of categories) {
              const category = await prisma.categoryTranslation.findFirst({
                where: {
                  name: catName,
                  languageId: LANG.en,
                },
                include: { category: true },
              });

              if (category) {
                await prisma.albumCategory.upsert({
                  where: {
                    albumId_categoryId: {
                      albumId: album.id,
                      categoryId: category.categoryId,
                    },
                  },
                  update: {},
                  create: {
                    albumId: album.id,
                    categoryId: category.categoryId,
                  },
                });
              } else {
                console.log(`⚠️ Category not found: ${catName}`);
              }
            }
          }
          console.log(`✅ Album Created: ${albumTitleEn}`);
        }
        albumMap.set(albumTitleEn.toLowerCase(), album);
      }

      // 🎵 AUDIO HANDLING (NEW LOGIC)
      let audio = audioMap.get(row["Audio File Name"]);

      if (!audio) {
        const audioUrl = `${CDN_BASE_URL}/audio-library/${ADMIN_ID}/${row["Audio File Name"]}`;
        const audioStoragePath = `audio-library/${ADMIN_ID}/${row["Audio File Name"]}`;

        const meta = await getAudioMetadataFromCDN(audioUrl);
        const fileHash = crypto.createHash("sha256").update(Math.random().toString()).digest("hex");

        audio = await prisma.audioLibrary.create({
          data: {
            originalName: row["Audio File Name"],
            storedFileName: row["Audio File Name"],
            createdById: ADMIN_ID,
            cdnPath: audioStoragePath,
            cdnUrl: audioUrl,
            fileHash,
            mimeType: meta.mimeType,
            fileSize: meta.size,
            durationSeconds: meta.duration,
            fileUploadStatus: "COMPLETED"
          },
        });
        console.log(`🎧 Audio Created: ${row["Audio File Name"]}`);
      }

      // Track Number
      let trackNumber = parseInt(row["Track Number"]);
      if (!trackNumber) {
        const lastTrack = await prisma.track.findFirst({
          where: { albumId: album.id },
          orderBy: { trackNumber: "desc" },
        });
        trackNumber = lastTrack ? lastTrack.trackNumber + 1 : 1;
      }

      const existingTrack = await prisma.track.findFirst({
        where: { albumId: album.id, trackNumber },
      });

      if (existingTrack) continue;

      // Track Cover Image URL
      let coverImageUrl = null;
      if (row["Track Cover Image"]) {
        coverImageUrl = `${CDN_BASE_URL}/TRACK/COVER_IMAGE/${row["Track Cover Image"]}`;
      }

      const track = await prisma.track.create({
        data: {
          albumId: album.id,
          audioLibraryId: audio.id,
          durationSeconds: audio.durationSeconds || 0,
          trackNumber,
          coverImage: coverImageUrl,
          status: "PUBLISHED",
        },
      });

      const prevDuration = albumDurationMap.get(album.id) || 0;
      albumDurationMap.set(
        album.id,
        prevDuration + (audio.durationSeconds || 0)
      );

      await prisma.trackTranslation.createMany({
        data: [
          {
            trackId: track.id,
            languageId: LANG.en,
            title: row["Track Title En"],
            description: row["Track Description En"],
          },
          {
            trackId: track.id,
            languageId: LANG.fr,
            title: row["Track Title Fr"],
            description: row["Track Description Fr"],
          },
        ],
      });

      console.log(`🎵 Track Created: ${row["Track Title En"]}`);
    } catch (err) {
      console.error("❌ Error processing row:", err.message);
    }
  }

  // ✅ Update totalDuration for all albums (SAFE APPROACH)
  for (const [albumId] of albumDurationMap.entries()) {
    const total = await prisma.track.aggregate({
      where: { albumId },
      _sum: {
        durationSeconds: true,
      },
    });

    await prisma.album.update({
      where: { id: albumId },
      data: {
        totalDuration: total._sum.durationSeconds || 0,
      },
    });

    console.log(`⏱️ Album duration updated: ${albumId} → ${total._sum.durationSeconds || 0}s`);
  }


  console.log("🎉 Import Completed");
}

importCSV()
  .then(() => {
    console.log("✅ Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Import Failed:", err);
    process.exit(1);
  });