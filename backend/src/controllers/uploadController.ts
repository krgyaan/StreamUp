import type { Request, Response } from 'express';
import type { FileUploadRequest } from '../types/index.js';
import db from '../db/index.js';
import { fileUploads, processingErrors } from '../db/schema.js';
import { fileUploadQueue } from '../queues/config.js';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';

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
    await fileUploadQueue.add('upload-file', {
      fileUploadId: newFileUpload.id,
      filePath: path,
      mimeType: mimetype,
      originalName: originalname,
      size: size,
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

export const handleGetJobSummary = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    console.log('[UploadController] Received job summary request.');
    try {
      const { fileUploadId } = req.params;
      console.log(`[UploadController] Fetching summary for fileUploadId: ${fileUploadId}`);

      const fileUploadArr = await db.select().from(fileUploads).where(eq(fileUploads.id, fileUploadId)).limit(1);
      const fileUpload = fileUploadArr[0];
      if (!fileUpload) {
        res.status(404).json({ error: 'File upload not found' });
        return;
      }

      const errors = await db.select().from(processingErrors).where(eq(processingErrors.fileUploadId, fileUploadId));

      // Calculate duration if possible
      let duration = 0;
      if (fileUpload.createdAt && fileUpload.updatedAt) {
        duration = Math.floor((new Date(fileUpload.updatedAt).getTime() - new Date(fileUpload.createdAt).getTime()) / 1000);
      }

      res.json({
        jobId: fileUpload.id,
        status: fileUpload.status,
        totalRows: fileUpload.totalRows || 0,
        successfulRows: (fileUpload.processedRows || 0),
        failedRows: (fileUpload.errorCount || 0),
        duration,
        startTime: fileUpload.createdAt ? new Date(fileUpload.createdAt).toISOString() : null,
        endTime: fileUpload.updatedAt ? new Date(fileUpload.updatedAt).toISOString() : null,
        fileName: fileUpload.originalName,
        fileSize: fileUpload.size,
        errors: errors.map(e => ({
          row: e.rowNumber,
          error: e.errorMessage,
          data: e.rowData
        }))
      });
    } catch (error) {
      console.error('[UploadController] Error fetching job summary:', error);
      res.status(500).json({ error: 'Error fetching job summary' });
    }
  };

export const handleGetAllJobSummaries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const jobs = await db.select().from(fileUploads).orderBy(desc(fileUploads.createdAt));
    res.json(jobs.map(job => ({
      jobId: job.id,
      status: job.status,
      fileName: job.originalName,
      fileSize: job.size,
      totalRows: job.totalRows || 0,
      successfulRows: job.processedRows || 0,
      failedRows: job.errorCount || 0,
      startTime: job.createdAt ? new Date(job.createdAt).toISOString() : null,
      endTime: job.updatedAt ? new Date(job.updatedAt).toISOString() : null,
    })));
  } catch (error) {
    console.error('[UploadController] Error fetching all job summaries:', error);
    res.status(500).json({ error: 'Error fetching job summaries' });
  }
};
