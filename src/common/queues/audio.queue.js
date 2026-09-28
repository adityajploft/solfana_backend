import { Queue } from "bullmq";
import redis from '../../config/redis.config.js';

export const audioQueue = new Queue("audio-processing", { connection: redis });

export async function addAudioJob(data) {

  console.log("Adding audio job to queue...");

  await audioQueue.add("process-audio", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    }
  });
}