import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getUploadDir } from '@/lib/uploads';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
};

// GET /api/uploads/:filename — serve an uploaded image from the data directory
export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Prevent path traversal — only allow a plain filename
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const filePath = path.join(getUploadDir(), filename);
    const data = await readFile(filePath);
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
