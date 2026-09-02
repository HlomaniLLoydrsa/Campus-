import { NextResponse } from 'next/server';
import { readImage } from '@/lib/storage';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
};

// GET /api/uploads/:filename — serve an uploaded image (Netlify Blobs in prod, disk locally)
export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const result = await readImage(filename);
  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = (filename.split('.').pop() || '').toLowerCase();
  const contentType = result.contentType || CONTENT_TYPES[ext] || 'application/octet-stream';
  return new NextResponse(result.data as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
