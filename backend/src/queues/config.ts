import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

// Queue names
export const QUEUE_NAMES = {
  FILE_UPLOAD: 'file-upload',
  FILE_CHUNKING: 'file-chunking',
  DATA_PROCESSING: 'data-processing',
} as const;

// Queue configurations
export const fileUploadQueue = new Queue(QUEUE_NAMES.FILE_UPLOAD, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

export const fileChunkingQueue = new Queue(QUEUE_NAMES.FILE_CHUNKING, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

export const dataProcessingQueue = new Queue(QUEUE_NAMES.DATA_PROCESSING, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});
