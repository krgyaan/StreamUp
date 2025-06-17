import type { Request, Response } from 'express';
import type { FileUploadRequest } from '../types/index.js';
import db from '../db/index.js';
import { fileUploads, processingErrors } from '../db/schema.js';
import { fileProcessingQueue } from '../queues/config.js';
import { eq } from 'drizzle-orm';

export const handleFileUpload = async (
  req: Request,
  res: Response
): Promise<void> => {
  const typedReq = req as FileUploadRequest;

  console.log('[UploadController] Received file upload request.');

  if (!typedReq.file) {
    console.error('[UploadController] No file provided in the request.');
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const { originalname, mimetype, size, path } = typedReq.file;
  console.log(`[UploadController] File details: Original Name: ${originalname}, Mime Type: ${mimetype}, Size: ${size} bytes, Path: ${path}`);

  try {
    // Create file upload record in database
    const [newFileUpload] = await db.insert(fileUploads).values({
      originalName: originalname,
      mimeType: mimetype,
      size: size,
      status: 'uploaded',
    }).returning();

    if (!newFileUpload) {
      console.error('[UploadController] Failed to create file upload record in the database.');
      res.status(500).json({ error: 'Failed to create file upload record' });
      return;
    }

    console.log(`[UploadController] File upload record created with ID: ${newFileUpload.id}.`);

    // Add job to the file processing queue
    await fileProcessingQueue.add('process-file-chunking', {
      fileUploadId: newFileUpload.id,
      filePath: path,
      mimeType: mimetype,
    });
    console.log(`[UploadController] File ${newFileUpload.id} queued for processing.`);

    res.status(200).json({ message: 'File uploaded and queued for processing', fileUploadId: newFileUpload.id });
    console.log(`[UploadController] Response sent for fileUploadId: ${newFileUpload.id}.`);
  } catch (error) {
    console.error('[UploadController] Error handling file upload:', error);
    res.status(500).json({ error: 'Failed to process file upload' });
  }
};

export const handleGetFileUploadStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log('[UploadController] Received file status request.');
  try {
    const { fileUploadId } = req.params;
    console.log(`[UploadController] Fetching status for fileUploadId: ${fileUploadId}`);

    const fileUpload = await db.select().from(fileUploads).where(eq(fileUploads.id, fileUploadId)).limit(1);

    if (!fileUpload[0]) {
      console.warn(`[UploadController] File upload not found for ID: ${fileUploadId}`);
      res.status(404).json({ error: 'File upload not found' });
      return;
    }

    console.log(`[UploadController] Found status for fileUploadId: ${fileUploadId}. Status: ${fileUpload[0].status}`);
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
    console.error('[UploadController] Error fetching file status:', error);
    res.status(500).json({ error: 'Error fetching file status' });
  }
};

export const handleGetProcessingErrors = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log('[UploadController] Received processing errors request.');
  try {
    const { fileUploadId } = req.params;
    console.log(`[UploadController] Fetching processing errors for fileUploadId: ${fileUploadId}`);

    const errors = await db.select().from(processingErrors).where(eq(processingErrors.fileUploadId, fileUploadId));

    console.log(`[UploadController] Found ${errors.length} errors for fileUploadId: ${fileUploadId}.`);
    res.json(errors);
  } catch (error) {
    console.error('[UploadController] Error fetching processing errors:', error);
    res.status(500).json({ error: 'Error fetching processing errors' });
  }
};
