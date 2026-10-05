import multer from 'multer';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 5 MB.' : err.message;
    return res.status(400).json({ message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0].message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'That record already exists.' });
  }

  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
}
