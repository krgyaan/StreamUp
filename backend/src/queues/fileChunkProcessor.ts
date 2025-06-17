import { Worker, Job } from 'bullmq';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { redis, QUEUE_NAMES } from './config.js';
import db  from '../db/index.js';
import { fileUploads, fileChunks } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const CHUNK_SIZE = 1000; // Number of rows per chunk
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

interface FileChunkJob {
  fileUploadId: string;
  filePath: string;
  mimeType: string;
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

async function processCSVFile(job: Job<FileChunkJob>) {
  const { fileUploadId, filePath } = job.data;
  let currentChunk: any[] = [];
  let chunkIndex = 0;
  let totalRows = 0;

  return new Promise((resolve, reject) => {
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
          await saveChunk(fileUploadId, currentChunk, chunkIndex);
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
          await saveChunk(fileUploadId, currentChunk, chunkIndex);
        }
        await updateFileUploadStatus(fileUploadId, totalRows);
        await sendProgressUpdate(fileUploadId, 'file_progress', {
          status: 'chunked',
          totalRows,
          totalChunks: chunkIndex + 1
        });
        resolve(true);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function processXLSXFile(job: Job<FileChunkJob>) {
  const { fileUploadId, filePath } = job.data;
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const totalRows = data.length;
  const chunks = [];

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < chunks.length; i++) {
    await saveChunk(fileUploadId, chunks[i], i);
    await sendProgressUpdate(fileUploadId, 'chunk_progress', {
      chunkIndex: i,
      totalChunks: chunks.length,
      totalRows
    });
  }

  await updateFileUploadStatus(fileUploadId, totalRows);
  await sendProgressUpdate(fileUploadId, 'file_progress', {
    status: 'chunked',
    totalRows,
    totalChunks: chunks.length
  });
}

async function saveChunk(fileUploadId: string, chunk: any[], chunkIndex: number) {
  const chunkPath = path.join(TEMP_DIR, `${fileUploadId}-chunk-${chunkIndex}.json`);
  await fs.promises.writeFile(chunkPath, JSON.stringify(chunk));

  await db.insert(fileChunks).values({
    fileUploadId,
    chunkIndex,
    rowCount: chunk.length,
    status: 'pending'
  });
}

async function updateFileUploadStatus(fileUploadId: string, totalRows: number) {
  await db.update(fileUploads)
    .set({
      totalRows,
      status: 'chunked',
      updatedAt: new Date()
    })
    .where(eq(fileUploads.id, fileUploadId));
}

export const fileChunkWorker = new Worker<FileChunkJob>(
  QUEUE_NAMES.FILE_CHUNKING,
  async (job) => {
    const { mimeType } = job.data;

    try {
      await sendProgressUpdate(job.data.fileUploadId, 'file_progress', {
        status: 'processing',
        message: 'Starting file processing...'
      });

      if (mimeType === 'text/csv') {
        await processCSVFile(job);
      } else {
        await processXLSXFile(job);
      }

      // Clean up the original file
      await fs.promises.unlink(job.data.filePath);

      return { success: true };
    } catch (error) {
      console.error('Error processing file:', error);
      await sendProgressUpdate(job.data.fileUploadId, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 1 // Process one file at a time
  }
);
