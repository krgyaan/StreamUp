import { Router } from 'express';
import { upload } from '../config/multer.js';
import { handleFileUpload, handleGetFileUploadStatus, handleGetProcessingErrors, handleGetJobSummary, handleGetAllJobSummaries } from '../controllers/uploadController.js';

const router = Router();

router.post('/upload', upload.single('file'), handleFileUpload);

router.get('/status/:fileUploadId', handleGetFileUploadStatus);

router.get('/errors/:fileUploadId', handleGetProcessingErrors);

router.get('/summary/:fileUploadId', handleGetJobSummary);

router.get('/jobs', handleGetAllJobSummaries);

export default router;
