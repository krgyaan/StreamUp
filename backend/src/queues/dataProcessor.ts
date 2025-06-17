import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { redis, QUEUE_NAMES } from './config.js';
import db from '../db/index.js';
import { fileChunks, fileUploads, processingErrors } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const BATCH_SIZE = 100; // Number of rows to insert at once

interface DataProcessingJob {
  fileUploadId: string;
  chunkIndex: number;
}

async function validateRow(row: any, rowNumber: number): Promise<string | null> {
  // Add your validation logic here
  // Return error message if validation fails, null if passes
  if (!row) return 'Empty row';
  // Add more validation rules as needed
  return null;
}

async function processChunk(job: Job<DataProcessingJob>) {
  const { fileUploadId, chunkIndex } = job.data;
  const chunkPath = path.join(TEMP_DIR, `${fileUploadId}-chunk-${chunkIndex}.json`);

  try {
    const chunkData = JSON.parse(await fs.promises.readFile(chunkPath, 'utf-8'));
    const errors: any[] = [];
    const validRows: any[] = [];

    // Validate each row
    for (let i = 0; i < chunkData.length; i++) {
      const row = chunkData[i];
      const error = await validateRow(row, i);

      if (error) {
        errors.push({
          fileUploadId,
          chunkIndex,
          rowNumber: i,
          errorMessage: error,
          rowData: row
        });
      } else {
        validRows.push(row);
      }
    }

    // Insert valid rows in batches
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      // Add your database insert logic here
      // Example: await db.insert(yourTable).values(batch);
    }

    // Record errors
    if (errors.length > 0) {
      await db.insert(processingErrors).values(errors);
    }

    // Update chunk status
    await db.update(fileChunks)
      .set({
        status: 'completed',
        errorCount: errors.length,
        updatedAt: new Date()
      })
      .where(eq(fileChunks.fileUploadId, fileUploadId))
      .where(eq(fileChunks.chunkIndex, chunkIndex));

    // Update file upload progress
    await db.update(fileUploads)
      .set({
        processedRows: db.raw(`processed_rows + ${validRows.length}`),
        errorCount: db.raw(`error_count + ${errors.length}`),
        updatedAt: new Date()
      })
      .where(eq(fileUploads.id, fileUploadId));

    // Clean up chunk file
    await fs.promises.unlink(chunkPath);

    return {
      success: true,
      processedRows: validRows.length,
      errorCount: errors.length
    };
  } catch (error) {
    console.error('Error processing chunk:', error);
    throw error;
  }
}

export const dataProcessingWorker = new Worker<DataProcessingJob>(
  QUEUE_NAMES.DATA_PROCESSING,
  processChunk,
  {
    connection: redis,
    concurrency: 5 // Process 5 chunks simultaneously
  }
);
