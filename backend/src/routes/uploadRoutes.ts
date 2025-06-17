import { Router, Request, Response } from 'express';
import { upload } from '../config/multer.js';
import { handleFileUpload, handleGetFileUploadStatus, handleGetProcessingErrors } from '../controllers/uploadController.js';
import db from '../db/index.js';
import { fileUploads, processingErrors } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/upload', upload.single('file'), handleFileUpload);

router.get('/status/:fileUploadId', handleGetFileUploadStatus);

router.get('/errors/:fileUploadId', handleGetProcessingErrors);

export default router;
