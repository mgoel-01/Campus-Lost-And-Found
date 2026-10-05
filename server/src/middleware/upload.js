import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';

const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext) || !file.mimetype.startsWith('image/')) {
      const err = new Error('Only image files (jpg, png, webp, gif) are allowed.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).single('image');
