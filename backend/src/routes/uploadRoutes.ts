import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { processFile, chunkingQueue, processingQueue } from '../services/fileProcessor.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and XLSX files are allowed.'));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    }
});

// Upload endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileInfo = {
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        // Start processing the file
        const jobId = await processFile(fileInfo);

        res.json({
            message: 'File uploaded successfully',
            jobId,
            fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Error processing file',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Job status endpoint
router.get('/job/:jobId', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        // Get chunking job status
        const chunkingJob = await chunkingQueue.getJob(jobId);
        const chunkingStatus = chunkingJob ? {
            status: await chunkingJob.getState(),
            progress: await chunkingJob.progress,
            result: chunkingJob.returnvalue,
            error: chunkingJob.failedReason
        } : null;

        // Get all processing jobs for this file
        const processingJobs = await processingQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
        const fileProcessingJobs = processingJobs.filter(job => job.data.jobId === jobId);

        const processingStatus = fileProcessingJobs.map(job => ({
            chunkIndex: job.data.chunkIndex,
            status: job.getState(),
            progress: job.progress,
            error: job.failedReason
        }));

        res.json({
            jobId,
            chunking: chunkingStatus,
            processing: processingStatus
        });
    } catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({
            error: 'Error getting job status',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
