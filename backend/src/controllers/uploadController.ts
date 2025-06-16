import type { Request, Response } from 'express';
import type { FileUploadRequest } from '../types/index.js';

export const handleFileUpload = async (
  req: Request,
  res: Response
): Promise<void> => {
  const typedReq = req as FileUploadRequest;

  console.log('typedReq.file', typedReq.file);

  if (!typedReq.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  // Proceed with upload logic
  res.status(200).json({ message: 'File received' });
  return;
};
