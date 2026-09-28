import axios from "axios";
import { parseBuffer } from "music-metadata";

export async function extractAudioMetadataFromCDN(cdnUrl) {
  try {
    const response = await axios.get(cdnUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });

    const buffer = Buffer.from(response.data);

    const metadata = await parseBuffer(buffer, null, {
      duration: true,
    });
    console.log(metadata,"metadata")

    return {
      durationSeconds: Math.floor(metadata.format.duration || 0),
      bitrate: metadata.format.bitrate || 0,
      sampleRate: metadata.format.sampleRate || 0,
      mimeType: metadata.format.mimeType || "audio/mpeg",
      fileSize: buffer.length || 0,
    };
  } catch (error) {
    console.error("Audio metadata extraction failed:", error.message);

    return {
      durationSeconds: 0,
      bitrate: 0,
      sampleRate: 0,
      mimeType: "audio/mpeg",
      fileSize: 0,
    };
  }
}