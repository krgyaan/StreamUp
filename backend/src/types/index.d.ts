import { Multer } from 'multer';
import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
    }
  }
}

export interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
}
