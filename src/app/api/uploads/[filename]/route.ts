import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
};

// GET /api/uploads/:filename — serve an uploaded image from Netlify Blobs
export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Prevent path traversal — only allow a plain filename
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const store = getStore('uploads');
    const result = await store.getWithMetadata(filename, { type: 'arrayBuffer' });
    if (!result || !result.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const contentType = (result.metadata?.contentType as string) || CONTENT_TYPES[ext] || 'application/octet-stream';
    return new NextResponse(result.data as ArrayBuffer, {
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
