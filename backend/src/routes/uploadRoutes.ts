import { Router, Request, Response } from 'express';
import upload from '../controllers/uploadMiddleware';
import { handleFileUpload } from '../controllers/uploadController';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.send('<h1>StreamUp Backend is Running Smoothly...</h1>');
    return;
});

router.post('/upload', upload.single('file'), handleFileUpload);

export default router;
