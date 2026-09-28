import fs from "fs";
import path from "path";
import { parseFile } from "music-metadata";
import prisma from "../../config/db.config.js";
import bunnyCDNService from "./bunnycdn.service.js";
import crypto from "crypto";
import { generateSlug } from "../utils/slugify.js";

export async function processAudioJob(job) {
  let filePath;

  try {
    let { filePath: originalFilePath, originalName, audioId, currentUser } = job.data;

    filePath = originalFilePath;

    const ext = path.extname(originalName);
    const newFilePath = filePath + ext;

    console.log(`Processing: ${originalName} (Job ${job.id})`);

    // ensure file has extension
    fs.renameSync(filePath, newFilePath);
    filePath = newFilePath;

    // Metadata
    const metadata = await parseFile(filePath);
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    await job.updateProgress(30);

    // 🔥 Prepare Bunny Path
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const fileSlug = generateSlug(nameWithoutExt);
    const finalFileName = `${fileSlug}${ext}`;

    const bunnyPath = `audio-library/${currentUser.id}/${finalFileName}`;

    const upload = await uploadWithRetry(filePath, bunnyPath, metadata.format.mimeType || "audio/mpeg");

    console.log("CDN upload completed");

    await job.updateProgress(70);

    const cdnUrl = upload.cdnUrl.startsWith("http") ? upload.cdnUrl : `https://${upload.cdnUrl}`;

    const fileHash = crypto.createHash("sha256").update(Math.random().toString()).digest("hex");

    await job.updateProgress(80);

    await prisma.audioLibrary.update({
      where: { id: audioId },
      data: {
        originalName: finalFileName,
        storedFileName: finalFileName,
        cdnPath: upload.storagePath,
        cdnUrl: cdnUrl,
        fileHash,
        fileSize,
        durationSeconds: metadata.format.duration,
        mimeType: "audio/mpeg",
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        fileUploadStatus: "COMPLETED"
      }
    });

    console.log("Database record created");

    await job.updateProgress(100);

  } catch (error) {
    console.error("Audio processing failed:", error);

    await prisma.audioLibrary.update({
      where: { id: job.data.audioId },
      data: {
        fileUploadStatus: "FAILED"
      }
    });

    throw error; // important for queue retry
  } finally {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      // 🧹 Delete temp file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("Deleted temp audio file:", filePath);
      }

      console.log("Cleanup done");
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
  }
}

// Upload with Retry
async function uploadWithRetry(filePathLocal, relativePath, mimeType, retries = 3) {
  try {
    const stream = fs.createReadStream(filePathLocal);

    return await bunnyCDNService.uploadStream(stream, relativePath, mimeType);
  } catch (err) {
    console.log(`Upload failed: ${relativePath} (${retries} retries left)`);

    if (retries > 0) {
      await new Promise(r => setTimeout(r, 300 * (4 - retries))); // backoff
      return uploadWithRetry(filePathLocal, relativePath, mimeType, retries - 1);
    }

    throw err; // fail after retries
  }
}