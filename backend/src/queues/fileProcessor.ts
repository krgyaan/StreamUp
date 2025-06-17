import { Queue, Worker, Job } from 'bullmq';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { redis, QUEUE_NAMES, fileChunkingQueue, dataProcessingQueue } from './config.js';
import db from '../db/index.js';
import { fileUploads, stores, processingErrors } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';

const CHUNK_SIZE = 1000;
const TEMP_DIR = path.join(process.cwd(), 'temp');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const LOCK_TTL = 30000;

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Ensure uploads directory exists (Multer usually handles this, but for safety)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface FileUploadJob {
  fileUploadId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
  size: number;
}

interface FileChunkingJob {
  fileUploadId: string;
  filePath: string;
  mimeType: string;
}

interface DataProcessingJob {
  fileUploadId: string;
  chunkIndex: number;
  chunkPath: string;
}

// WebSocket service instance (will be set from main server)
let wsService: any = null;

export function setWebSocketService(service: any) {
  wsService = service;
}

async function sendProgressUpdate(fileUploadId: string, type: string, data: any) {
  if (wsService) {
    wsService.sendProgressUpdate({
      type,
      fileUploadId,
      data
    });
  }
}

// Add lock management functions
async function acquireLock(key: string): Promise<boolean> {
  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, '1', 'EX', LOCK_TTL / 1000);
  return result === 'OK';
}

async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  await redis.del(lockKey);
}

// Add this above the dataProcessingWorker definition
class NonRetryableError extends Error {
  retryable: boolean;
  constructor(message: string) {
    super(message);
    this.retryable = false;
    this.name = 'NonRetryableError';
  }
}

// Add these functions before the worker definition
async function processRow(row: any) {
    // Validate and insert into the 'stores' table
    await db.insert(stores).values({
        storeName: row.storeName,
        storeAddress: row.storeAddress,
        cityName: row.cityName,
        regionName: row.regionName,
        retailerName: row.retailerName,
        storeType: row.storeType,
        storeLongitude: row.storeLongitude,
        storeLatitude: row.storeLatitude,
    });
}

async function updateFileUploadProgress(fileUploadId: string, processedRows: number, errorCount: number) {
    await updateFileUploadProcessedRowsAndErrors(fileUploadId, processedRows, errorCount);
    await sendProgressUpdate(fileUploadId, 'processing_progress', {
        processedRows,
        errorCount
    });
}

// --- Worker for File Upload Queue ---
export const fileUploadWorker = new Worker<FileUploadJob>(
  QUEUE_NAMES.FILE_UPLOAD,
  async (job) => {
    const { fileUploadId, filePath, mimeType, originalName, size } = job.data;
    console.log(`[FileUploadWorker] Starting file upload processing for fileUploadId: ${fileUploadId}`);

    try {
      await db.update(fileUploads)
        .set({
          status: 'uploaded',
          updatedAt: new Date()
        })
        .where(eq(fileUploads.id, fileUploadId));
      console.log(`[FileUploadWorker] File metadata uploaded to DB for fileUploadId: ${fileUploadId}.`);

      // Move the file to a persistent temporary location
      const persistentFilePath = path.join(TEMP_DIR, `${fileUploadId}-${path.basename(filePath)}`);
      console.log(`[FileUploadWorker] Moving file from ${filePath} to ${persistentFilePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      await fs.promises.rename(filePath, persistentFilePath);
      console.log(`[FileUploadWorker] File successfully moved to persistent location: ${persistentFilePath}`);

      await sendProgressUpdate(fileUploadId, 'file_progress', {
        status: 'uploaded',
        message: 'File metadata uploaded to database.'
      });

      // Add job to the next queue (File Chunking) with the persistent file path
      await fileChunkingQueue.add('process-file-chunking', {
        fileUploadId,
        filePath: persistentFilePath,
        mimeType
      });
      console.log(`[FileUploadWorker] File ${fileUploadId} queued for chunking.`);

      return { success: true, message: 'File uploaded to DB and queued for chunking.' };
    } catch (error) {
      console.error(`[FileUploadWorker] Error processing file upload for ${fileUploadId}:`, error);
      // Clean up the initially uploaded file if an error occurs during move/processing
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      await sendProgressUpdate(fileUploadId, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 1
  }
);

fileUploadWorker.on('failed', (job, err) => {
  console.error(`[FileUploadWorker] Job ${job?.id} failed:`, err);
  if (job?.data.fileUploadId && wsService) {
    wsService.sendProgressUpdate(job.data.fileUploadId, 'error', {
      message: err.message,
      jobId: job.id,
      jobName: job.name,
      fileUploadId: job.data.fileUploadId
    });
  }
});

fileUploadWorker.on('error', (err) => {
  console.error('[FileUploadWorker] Worker error:', err);
});

// --- Worker for File Chunking Queue ---
export const fileChunkingWorker = new Worker<FileChunkingJob>(
  QUEUE_NAMES.FILE_CHUNKING,
  async (job) => {
    const { fileUploadId, filePath, mimeType } = job.data;
    console.log(`[FileChunkingWorker] Starting file chunking for fileUploadId: ${fileUploadId} from persistent path: ${filePath}`);
    let totalRows = 0;
    let chunkIndex = 0;
    const chunkPaths: string[] = []; // Array to store all chunk paths

    try {
      await sendProgressUpdate(fileUploadId, 'file_progress', {
        status: 'chunking',
        message: 'Starting file chunking...'
      });

      if (mimeType === 'text/csv') {
        console.log(`[FileChunkingWorker] Processing CSV file: ${filePath}`);
        await new Promise<void>((resolve, reject) => {
          let currentChunk: any[] = [];
          const parser = parse({
            columns: true,
            skip_empty_lines: true
          });

          fs.createReadStream(filePath)
            .pipe(parser)
            .on('data', (row) => {
              totalRows++;
              currentChunk.push(row);

              if (currentChunk.length >= CHUNK_SIZE) {
                parser.pause();
                saveChunkAndQueueDataProcess(fileUploadId, currentChunk, chunkIndex)
                  .then(() => {
                    chunkPaths.push(path.join(TEMP_DIR, `${fileUploadId}-chunk-${chunkIndex}.json`));
                    sendProgressUpdate(fileUploadId, 'chunk_progress', {
                      chunkIndex,
                      totalChunks: Math.ceil(totalRows / CHUNK_SIZE),
                      totalRows
                    });
                    currentChunk = [];
                    chunkIndex++;
                    parser.resume();
                  })
                  .catch((err) => {
                    reject(err);
                  });
              }
            })
            .on('end', async () => {
              if (currentChunk.length > 0) {
                console.log(`[FileChunkingWorker] Saving final CSV chunk ${chunkIndex} with ${currentChunk.length} rows to temp and queuing for data processing.`);
                await saveChunkAndQueueDataProcess(fileUploadId, currentChunk, chunkIndex);
                chunkPaths.push(path.join(TEMP_DIR, `${fileUploadId}-chunk-${chunkIndex}.json`));
              }
              console.log(`[FileChunkingWorker] CSV chunking complete for file ${fileUploadId}. Total rows: ${totalRows}`);
              await updateFileUploadTotalRows(fileUploadId, totalRows);
              await sendProgressUpdate(fileUploadId, 'file_progress', {
                status: 'chunked',
                totalRows,
                totalChunks: chunkIndex + 1
              });
              resolve();
            })
            .on('error', (error) => {
              console.error(`[FileChunkingWorker] Error during CSV chunking for file ${fileUploadId}:`, error);
              reject(error);
            });
        });
      } else {
        console.log(`[FileChunkingWorker] Processing XLSX file: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        totalRows = data.length;
        console.log(`[FileChunkingWorker] XLSX file loaded. Total rows identified by XLSX.utils.sheet_to_json: ${totalRows}`);

        const chunks = [];
        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          chunks.push(chunk);
          console.log(`[FileChunkingWorker] Prepared XLSX chunk ${i} with ${chunk.length} rows.`);
        }

        for (let i = 0; i < chunks.length; i++) {
          console.log(`[FileChunkingWorker] Saving XLSX chunk ${i} to temp and queuing for data processing.`);
          await saveChunkAndQueueDataProcess(fileUploadId, chunks[i], i);
          chunkPaths.push(path.join(TEMP_DIR, `${fileUploadId}-chunk-${i}.json`)); // Add path to array
          await sendProgressUpdate(fileUploadId, 'chunk_progress', {
            chunkIndex: i,
            totalChunks: chunks.length,
            totalRows
          });
        }
        console.log(`[FileChunkingWorker] XLSX chunking complete for file ${fileUploadId}. Total rows: ${totalRows}`);
        await updateFileUploadTotalRows(fileUploadId, totalRows);
        await sendProgressUpdate(fileUploadId, 'file_progress', {
          status: 'chunked',
          totalRows,
          totalChunks: chunks.length
        });
      }

      // Clean up the original file after chunking (now the persistent file)
      console.log(`[FileChunkingWorker] Deleting persistent file: ${filePath}`);
      await fs.promises.unlink(filePath);
      console.log(`[FileChunkingWorker] Persistent file deleted: ${filePath}`);

      // Save the list of chunk paths locally
      const chunkPathsFileName = `${fileUploadId}-chunk-paths.json`;
      const chunkPathsFilePath = path.join(TEMP_DIR, chunkPathsFileName);
      await fs.promises.writeFile(chunkPathsFilePath, JSON.stringify(chunkPaths, null, 2), 'utf8');
      console.log(`[FileChunkingWorker] All chunk paths saved to ${chunkPathsFilePath}`);

      return { success: true, message: 'File chunked and queued for data processing.' };
    } catch (error) {
      console.error(`[FileChunkingWorker] General error during file chunking for file ${fileUploadId}:`, error);
      await sendProgressUpdate(fileUploadId, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 1
  }
);

fileChunkingWorker.on('failed', (job, err) => {
  console.error(`[FileChunkingWorker] Job ${job?.id} failed:`, err);
  if (job?.data.fileUploadId && wsService) {
    wsService.sendProgressUpdate(job.data.fileUploadId, 'error', {
      message: err.message,
      jobId: job.id,
      jobName: job.name,
      fileUploadId: job.data.fileUploadId
    });
  }
});

fileChunkingWorker.on('error', (err) => {
  console.error('[FileChunkingWorker] Worker error:', err);
});

async function saveChunkAndQueueDataProcess(fileUploadId: string, chunk: any[], chunkIndex: number) {
  const chunkPath = path.join(TEMP_DIR, `${fileUploadId}-chunk-${chunkIndex}.json`);
  console.log(`[FileChunkingWorker] Attempting to save chunk ${chunkIndex} to ${chunkPath}. Actual row count: ${chunk.length}`);

  try {
    const jsonString = JSON.stringify(chunk, null, 0);
    await fs.promises.writeFile(chunkPath, jsonString, { encoding: 'utf8', flag: 'w' });
    console.log(`[FileChunkingWorker] Successfully saved chunk ${chunkIndex} to ${chunkPath}.`);

    await dataProcessingQueue.add('process-chunk-data', {
      fileUploadId,
      chunkIndex,
      chunkPath
    });
    console.log(`[FileChunkingWorker] Queued processing for chunk ${chunkIndex} of file ${fileUploadId}.`);
  } catch (error) {
    console.error(`[FileChunkingWorker] Error saving or queuing chunk ${chunkIndex}:`, error);
    throw error;
  }
}

async function updateFileUploadTotalRows(fileUploadId: string, totalRows: number) {
  console.log(`[FileChunkingWorker] Updating file upload total rows for ${fileUploadId} to: ${totalRows}`);
  await db.update(fileUploads)
    .set({
      totalRows,
      updatedAt: new Date()
    })
    .where(eq(fileUploads.id, fileUploadId));
  console.log(`[FileChunkingWorker] File upload total rows updated for ${fileUploadId}.`);
}

// --- Worker for Data Processing Queue ---
export const dataProcessingWorker = new Worker<DataProcessingJob>(
  QUEUE_NAMES.DATA_PROCESSING,
  async (job) => {
    const { fileUploadId, chunkIndex, chunkPath } = job.data;
    const lockKey = `lock:${fileUploadId}:${chunkIndex}`;

    // Try to acquire lock
    const lockAcquired = await acquireLock(lockKey);
    if (!lockAcquired) {
      console.log(`[DataProcessingWorker] Chunk ${chunkIndex} for file ${fileUploadId} is already being processed, skipping...`);
      return { status: 'skipped', reason: 'already_processing' };
    }

    try {
      console.log(`[DataProcessingWorker] Starting data processing for file ${fileUploadId}, chunk ${chunkIndex} from ${chunkPath}`);

      // Check if chunk file exists
      if (!existsSync(chunkPath)) {
        throw new NonRetryableError(`Chunk file not found: ${chunkPath}`);
      }

      // Read and parse chunk file
      const chunkData = JSON.parse(await readFile(chunkPath, 'utf-8'));
      let processedRows = 0;
      let errorCount = 0;

      // Process each row
      for (const row of chunkData) {
        try {
          await processRow(row);
          processedRows++;
        } catch (error) {
          console.error(`[DataProcessingWorker] Error processing row:`, error);
          errorCount++;
        }
      }

      // Update file upload record
      await updateFileUploadProgress(fileUploadId, processedRows, errorCount);

      // Clean up chunk file
      await unlink(chunkPath);

      return { status: 'completed', processedRows, errorCount };
    } catch (error) {
      console.error(`[DataProcessingWorker] Error processing chunk ${chunkIndex} for file ${fileUploadId}:`, error);
      throw error;
    } finally {
      // Always release the lock
      await releaseLock(lockKey);
    }
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 1000
    },
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        return Math.min(attemptsMade * 1000, 10000); // Max 10 second delay
      }
    }
  }
);

dataProcessingWorker.on('failed', async (job: Job | undefined, error: Error) => {
    if (!job) return;

    console.error(`[DataProcessingWorker] Job ${job.id} failed:`, error);

    if (error instanceof NonRetryableError) {
        console.log(`[DataProcessingWorker] Job ${job.id} for chunk file not found is now permanently failed and will not be retried.`);
        await job.discard();
    } else {
        // Use exponential backoff for retryable errors
        await job.retry();
    }
});

dataProcessingWorker.on('error', (err) => {
  console.error('[DataProcessingWorker] Worker error:', err);
});

async function updateFileUploadProcessedRowsAndErrors(fileUploadId: string, processedRows: number, errorCount: number) {
  console.log(`[DataProcessingWorker] Atomically incrementing processedRows and errorCount for ${fileUploadId} by ${processedRows}, ${errorCount}`);
  await db.execute(
    sql`UPDATE file_uploads
        SET processed_rows = processed_rows + ${processedRows},
            error_count = error_count + ${errorCount},
            updated_at = NOW()
        WHERE id = ${fileUploadId}`
  );
  console.log(`[DataProcessingWorker] Atomic update complete for ${fileUploadId}.`);
}

export async function stopAllQueues() {
  console.log('[QueueManager] Stopping all queues...');

  try {
    // Close all workers
    await Promise.all([
      fileUploadWorker.close(),
      fileChunkingWorker.close(),
      dataProcessingWorker.close()
    ]);
    console.log('[QueueManager] All workers closed successfully');

    // Close Redis connection
    await redis.quit();
    console.log('[QueueManager] Redis connection closed successfully');
  } catch (error) {
    console.error('[QueueManager] Error stopping queues:', error);
    throw error;
  }
}
