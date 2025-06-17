import { Router, Request, Response } from 'express';
import { upload } from '../config/multer.js';
import db from '../db/index.js';
import { fileUploads, processingErrors } from '../db/schema.js';
import { fileChunkQueue } from '../queues/config.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Create file upload record
    const [fileUpload] = await db.insert(fileUploads)
      .values({
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: 'pending'
      })
      .returning();

    // Queue file for chunking
    await fileChunkQueue.add('chunk-file', {
      fileUploadId: fileUpload.id,
      filePath: req.file.path,
      mimeType: req.file.mimetype
    });

    res.json({
      success: true,
      fileUploadId: fileUpload.id,
      message: 'File uploaded successfully and queued for processing'
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: 'Error processing file upload' });
  }
});

router.get('/status/:fileUploadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileUploadId } = req.params;

    const fileUpload = await db.select().from(fileUploads).where(eq(fileUploads.id, fileUploadId)).limit(1);

    if (!fileUpload[0]) {
      res.status(404).json({ error: 'File upload not found' });
      return;
    }

    res.json({
      status: fileUpload[0].status,
      totalRows: fileUpload[0].totalRows,
      processedRows: fileUpload[0].processedRows,
      errorCount: fileUpload[0].errorCount,
      progress: fileUpload[0].totalRows && fileUpload[0].processedRows
        ? Math.round((fileUpload[0].processedRows / fileUpload[0].totalRows) * 100)
        : 0
    });
  } catch (error) {
    console.error('Error fetching file status:', error);
    res.status(500).json({ error: 'Error fetching file status' });
  }
});

router.get('/errors/:fileUploadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileUploadId } = req.params;

    const errors = await db.select().from(processingErrors).where(eq(processingErrors.fileUploadId, fileUploadId));

    res.json(errors);
  } catch (error) {
    console.error('Error fetching processing errors:', error);
    res.status(500).json({ error: 'Error fetching processing errors' });
  }
});

export default router;
