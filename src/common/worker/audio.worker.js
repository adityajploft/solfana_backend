import { Worker } from "bullmq";
import { processAudioJob } from "../services/audio-processing.service.js";

import redis from '../../config/redis.config.js';

new Worker(
  "audio-processing",
  async (job) => {
    console.log("=================================");
    console.log("Starting audio job:", job.id);

    await processAudioJob(job);

    console.log("Audio job completed:", job.id);
    console.log("=================================");
  },
  {
    connection: redis,
    concurrency: 2,
    lockDuration: 900000 // 15 minutes for long FFmpeg jobs
  }
);