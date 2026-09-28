import { Queue } from "bullmq";
import redis from '../../config/redis.config.js';

export const notificationQueue = new Queue('notification-queue', { connection: redis });