import { Worker, Job } from 'bullmq';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { redis, QUEUE_NAMES, fileProcessingQueue } from './config.js';
import db from '../db/index.js';
import { fileUploads, stores, processingErrors } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { validate } from 'uuid';

const CHUNK_SIZE = 1000;
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

interface FileProcessJob {
  fileUploadId: string;
  filePath: string;
  mimeType: string;
  chunkIndex?: number;
  chunkPath?: string;
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

async function processFileChunking(job: Job<FileProcessJob>) {
  const { fileUploadId, filePath, mimeType } = job.data;
  console.log(`[FileProcessor] Starting file chunking for fileUploadId: ${fileUploadId}`);
  let totalRows = 0;
  let chunkIndex = 0;

  try {
    await sendProgressUpdate(fileUploadId, 'file_progress', {
      status: 'processing',
      message: 'Starting file processing...'
    });

    if (mimeType === 'text/csv') {
      console.log(`[FileProcessor] Processing CSV file: ${filePath}`);
      await new Promise<void>((resolve, reject) => {
        let currentChunk: any[] = [];
        const parser = parse({
          columns: true,
          skip_empty_lines: true
        });

        fs.createReadStream(filePath)
          .pipe(parser)
          .on('data', async (row) => {
            totalRows++;
            currentChunk.push(row);

            if (currentChunk.length >= CHUNK_SIZE) {
              console.log(`[FileProcessor] Saving and queuing CSV chunk ${chunkIndex} for file ${fileUploadId}`);
              await saveAndQueueChunk(fileUploadId, currentChunk, chunkIndex);
              await sendProgressUpdate(fileUploadId, 'chunk_progress', {
                chunkIndex,
                totalChunks: Math.ceil(totalRows / CHUNK_SIZE),
                totalRows
              });
              currentChunk = [];
              chunkIndex++;
            }
          })
          .on('end', async () => {
            if (currentChunk.length > 0) {
              console.log(`[FileProcessor] Saving and queuing final CSV chunk ${chunkIndex} for file ${fileUploadId}`);
              await saveAndQueueChunk(fileUploadId, currentChunk, chunkIndex);
            }
            console.log(`[FileProcessor] CSV chunking complete for file ${fileUploadId}. Total rows: ${totalRows}`);
            await updateFileUploadStatus(fileUploadId, totalRows);
            await sendProgressUpdate(fileUploadId, 'file_progress', {
              status: 'chunked',
              totalRows,
              totalChunks: chunkIndex + 1
            });
            resolve();
          })
          .on('error', (error) => {
            console.error(`[FileProcessor] Error during CSV chunking for file ${fileUploadId}:`, error);
            reject(error);
          });
      });
    } else {
      console.log(`[FileProcessor] Processing XLSX file: ${filePath}`);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      totalRows = data.length;

      const chunks = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        console.log(`[FileProcessor] Saving and queuing XLSX chunk ${i} for file ${fileUploadId}`);
        await saveAndQueueChunk(fileUploadId, chunks[i], i);
        await sendProgressUpdate(fileUploadId, 'chunk_progress', {
          chunkIndex: i,
          totalChunks: chunks.length,
          totalRows
        });
      }
      console.log(`[FileProcessor] XLSX chunking complete for file ${fileUploadId}. Total rows: ${totalRows}`);
      await updateFileUploadStatus(fileUploadId, totalRows);
      await sendProgressUpdate(fileUploadId, 'file_progress', {
        status: 'chunked',
        totalRows,
        totalChunks: chunks.length
      });
    }

    // Clean up the original file
    console.log(`[FileProcessor] Deleting original file: ${filePath}`);
    await fs.promises.unlink(filePath);
    console.log(`[FileProcessor] Original file deleted: ${filePath}`);
    return { success: true };
  } catch (error) {
    console.error(`[FileProcessor] General error during file chunking for file ${fileUploadId}:`, error);
    await sendProgressUpdate(fileUploadId, 'error', {
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    throw error;
  }
}

async function saveAndQueueChunk(fileUploadId: string, chunk: any[], chunkIndex: number) {
  const chunkPath = path.join(TEMP_DIR, `${fileUploadId}-chunk-${chunkIndex}.json`);
  console.log(`[FileProcessor] Attempting to save chunk ${chunkIndex} to ${chunkPath}`);

  try {
    const jsonString = JSON.stringify(chunk, null, 0);
    await fs.promises.writeFile(chunkPath, jsonString, { encoding: 'utf8', flag: 'w' });
    console.log(`[FileProcessor] Successfully saved chunk ${chunkIndex} to ${chunkPath}.`);

    await fileProcessingQueue.add('process-chunk-data', {
      fileUploadId,
      chunkIndex,
      chunkPath
    });
    console.log(`[FileProcessor] Queued processing for chunk ${chunkIndex} of file ${fileUploadId}.`);
  } catch (error) {
    console.error(`[FileProcessor] Error queuing chunk ${chunkIndex}:`, error);
    throw error;
  }
}

async function updateFileUploadStatus(fileUploadId: string, totalRows: number) {
  console.log(`[FileProcessor] Updating file upload status for ${fileUploadId} to 'chunked' with total rows: ${totalRows}`);
  await db.update(fileUploads)
    .set({
      totalRows,
      status: 'chunked',
      updatedAt: new Date()
    })
    .where(eq(fileUploads.id, fileUploadId));
  console.log(`[FileProcessor] File upload status updated for ${fileUploadId}.`);
}

async function processChunkData(job: Job<FileProcessJob>) {
  const { fileUploadId, chunkIndex, chunkPath } = job.data;
  console.log(`[FileProcessor] Starting data processing for file ${fileUploadId}, chunk ${chunkIndex} from ${chunkPath}`);
  let processedRows = 0;
  let errorCount = 0;
  let chunkData: any[] = [];

  try {
    const fileContent = await fs.promises.readFile(chunkPath as string, 'utf8');
    chunkData = JSON.parse(fileContent);
    console.log(`[FileProcessor] Loaded chunk data for file ${fileUploadId}, chunk ${chunkIndex}. Rows to process: ${chunkData.length}`);

    for (const row of chunkData) {
      try {
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
        processedRows++;
      } catch (error) {
        console.error(`[FileProcessor] Error processing row in chunk ${chunkIndex} for file ${fileUploadId}:`, error);
        errorCount++;
        // Save error details to a processingErrors table
        await db.insert(processingErrors).values({
          fileUploadId,
          chunkIndex: chunkIndex as number,
          rowNumber: chunkData.indexOf(row) + 1, // Approximate row number within the file
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          rowData: row,
        });
      }
    }
    console.log(`[FileProcessor] Finished processing chunk ${chunkIndex} for file ${fileUploadId}. Processed: ${processedRows}, Errors: ${errorCount}`);

    // Update the fileUploads table directly
    await updateFileUploadProcessedRows(fileUploadId, processedRows, errorCount);
    console.log(`[FileProcessor] Updated file upload processed rows and error count for ${fileUploadId}.`);

    await fs.promises.unlink(chunkPath as string); // Clean up chunk file
    console.log(`[FileProcessor] Cleaned up chunk file: ${chunkPath}`);

    await sendProgressUpdate(fileUploadId, 'processing_progress', {
      processedRows,
      errorCount,
      chunkIndex
    });
  } catch (error) {
    console.error(`[FileProcessor] Error processing chunk ${chunkIndex} for file ${fileUploadId}:`, error);
    // On error, update the fileUploads with estimated errors for the chunk
    await updateFileUploadProcessedRows(fileUploadId, 0, chunkData?.length || 0);
    await sendProgressUpdate(fileUploadId, 'error', {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      chunkIndex
    });
    throw error;
  }
}

async function updateFileUploadProcessedRows(fileUploadId: string, processedRows: number, errorCount: number) {
  console.log(`[FileProcessor] Fetching current fileUpload record for ${fileUploadId} to update processed rows.`);
  const [fileUpload] = await db.select().from(fileUploads).where(eq(fileUploads.id, fileUploadId));

  if (fileUpload) {
    console.log(`[FileProcessor] Current processedRows for ${fileUploadId}: ${fileUpload.processedRows}, errorCount: ${fileUpload.errorCount}`);
    await db.update(fileUploads)
      .set({
        processedRows: (fileUpload.processedRows || 0) + processedRows,
        errorCount: (fileUpload.errorCount || 0) + errorCount,
        updatedAt: new Date()
      })
      .where(eq(fileUploads.id, fileUploadId));
    console.log(`[FileProcessor] Updated fileUpload ${fileUploadId}: processedRows: ${(fileUpload.processedRows || 0) + processedRows}, errorCount: ${(fileUpload.errorCount || 0) + errorCount}`);
  } else {
    console.warn(`[FileProcessor] File upload record not found for ID: ${fileUploadId}`);
  }
}

export const fileProcessingWorker = new Worker<FileProcessJob>(
  QUEUE_NAMES.FILE_PROCESSING,
  async (job) => {
    console.log(`[FileProcessor] Received job: ${job.name} (ID: ${job.id}) for fileUploadId: ${job.data.fileUploadId}`);
    if (job.name === 'process-file-chunking') {
      return processFileChunking(job);
    } else if (job.name === 'process-chunk-data') {
      return processChunkData(job);
    } else {
      console.error(`[FileProcessor] Unknown job type received: ${job.name}`);
      throw new Error('Unknown job type');
    }
  },
  {
    connection: redis,
    concurrency: 5
  }
);

fileProcessingWorker.on('failed', (job, err) => {
  console.error(`[FileProcessor] Job ${job?.id} failed:`, err);
  if (job?.data.fileUploadId && wsService) {
    wsService.sendProgressUpdate(job.data.fileUploadId, 'error', {
      message: err.message,
      jobId: job.id,
      jobName: job.name,
      fileUploadId: job.data.fileUploadId
    });
  }
});

fileProcessingWorker.on('error', (err) => {
  console.error('[FileProcessor] Worker error:', err);
});
