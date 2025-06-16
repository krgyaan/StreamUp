import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';

const allowedExtensions = ['.csv', '.xls', '.xlsx'];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  console.log('File Extension Received: ', ext);

  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Only CSV and Excel files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

export default upload;
