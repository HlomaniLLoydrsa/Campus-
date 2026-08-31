import path from 'path';

// Uploaded images are stored under DATA_DIR/uploads so they persist on a mounted disk in production.
// Locally this defaults to <project>/public/uploads so Next can serve them statically during dev.
export function getUploadDir(): string {
  if (process.env.DATA_DIR) {
    return path.join(process.env.DATA_DIR, 'uploads');
  }
  return path.join(process.cwd(), 'public', 'uploads');
}

// The public URL for an uploaded file. When DATA_DIR is set (production), files are served
// through the /api/uploads route; locally they're served directly from /uploads.
export function getUploadUrl(filename: string): string {
  if (process.env.DATA_DIR) {
    return `/api/uploads/${filename}`;
  }
  return `/uploads/${filename}`;
}
