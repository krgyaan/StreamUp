import { Queue, Worker, Job } from 'bullmq';
import { createReadStream } from 'fs';
import { createWriteStream } from 'fs';
import { mkdir, unlink, readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

// Queue configurations
const CHUNK_SIZE = 1000; // Number of rows per chunk
const MAX_CONCURRENT_JOBS = 3; // Maximum number of concurrent database insert jobs

// Create queues
export const chunkingQueue = new Queue('file-chunking', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

export const processingQueue = new Queue('file-processing', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CHUNKS_DIR = path.join(process.cwd(), 'chunks');

async function ensureDirectories() {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await mkdir(CHUNKS_DIR, { recursive: true });
}

interface FileInfo {
    filename: string;
    path: string;
    size: number;
    mimetype: string;
}

interface ChunkingJobData {
    jobId: string;
    fileInfo: FileInfo;
}

interface ProcessingJobData {
    jobId: string;
    chunkPath: string;
    chunkIndex: number;
}

// Process uploaded file
export async function processFile(fileInfo: FileInfo) {
    await ensureDirectories();

    const jobId = uuidv4();

    // Add file to chunking queue
    await chunkingQueue.add('chunk-file', {
        jobId,
        fileInfo
    }, {
        jobId,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    });

    return jobId;
}

// Setup chunking worker
const chunkingWorker = new Worker<ChunkingJobData>('file-chunking', async (job) => {
    const { fileInfo, jobId } = job.data;
    const filePath = fileInfo.path;
    const fileExt = path.extname(fileInfo.filename).toLowerCase();

    let parser: Readable;

    if (fileExt === '.csv') {
        parser = createReadStream(filePath).pipe(
            parse({
                columns: true,
                skip_empty_lines: true
            })
        );
    } else {
        // Handle XLSX files (you'll need to add xlsx parsing logic here)
        throw new Error('XLSX support not implemented yet');
    }

    let rows: any[] = [];
    let chunkIndex = 0;

    for await (const row of parser) {
        rows.push(row);

        if (rows.length >= CHUNK_SIZE) {
            const chunkPath = path.join(CHUNKS_DIR, `${jobId}-chunk-${chunkIndex}.json`);
            createWriteStream(chunkPath).write(JSON.stringify(rows));

            // Add chunk to processing queue
            await processingQueue.add('process-chunk', {
                jobId,
                chunkPath,
                chunkIndex
            }, {
                jobId: `${jobId}-chunk-${chunkIndex}`,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            rows = [];
            chunkIndex++;
        }
    }

    // Process remaining rows
    if (rows.length > 0) {
        const chunkPath = path.join(CHUNKS_DIR, `${jobId}-chunk-${chunkIndex}.json`);
        createWriteStream(chunkPath).write(JSON.stringify(rows));

        await processingQueue.add('process-chunk', {
            jobId,
            chunkPath,
            chunkIndex
        }, {
            jobId: `${jobId}-chunk-${chunkIndex}`,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        });
    }

    return { jobId, totalChunks: chunkIndex + 1 };
}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    },
    concurrency: 1 // Process one file at a time
});

// Setup processing worker
const processingWorker = new Worker<ProcessingJobData>('file-processing', async (job) => {
    const { jobId, chunkPath, chunkIndex } = job.data;

    try {
        const chunkData = JSON.parse(await readFile(chunkPath, 'utf-8'));

        // Process each row in the chunk
        for (const [index, row] of chunkData.entries()) {
            try {
                // Add your database insertion logic here
                // await db.insert(yourTable).values(row);

                // Update job progress
                await job.updateProgress((index + 1) / chunkData.length * 100);
            } catch (error) {
                console.error(`Error processing row ${index} in chunk ${chunkIndex}:`, error);
                // You might want to store these errors in a separate table
            }
        }

        // Clean up chunk file
        await unlink(chunkPath);

        return { jobId, chunkIndex, status: 'completed' };
    } catch (error) {
        console.error(`Error processing chunk ${chunkIndex}:`, error);
        throw error;
    }
}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    },
    concurrency: MAX_CONCURRENT_JOBS
});

// Error handling
chunkingWorker.on('error', (error) => {
    console.error('Chunking worker error:', error);
});

processingWorker.on('error', (error) => {
    console.error('Processing worker error:', error);
});

// Cleanup function
export async function cleanup() {
    await chunkingQueue.close();
    await processingQueue.close();
    await chunkingWorker.close();
    await processingWorker.close();
}
