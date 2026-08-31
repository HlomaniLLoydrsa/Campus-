import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

// Map common image MIME types to a clean file extension
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Accept ANY image type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please upload an image file.' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Image too large. Maximum 10MB.' }, { status: 400 });
    }

    // Derive a clean extension
    let ext = MIME_EXT[file.type.toLowerCase()];
    if (!ext) {
      const raw = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      ext = raw && raw.length <= 5 ? raw : 'img';
    }

    const filename = `${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const store = getStore('uploads');
    await store.set(filename, bytes, { metadata: { contentType: file.type } });

    // Served back through the /api/uploads route
    const url = `/api/uploads/${filename}`;
    return NextResponse.json({ url, filename }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
