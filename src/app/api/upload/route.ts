import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { saveImage } from '@/lib/storage';
import { requireUserId } from '@/lib/auth';

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
    // Only signed-in users may upload (prevents anonymous storage abuse).
    const auth = await requireUserId();
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Accept ANY image — by MIME type, or (when the browser sends a generic/blank
    // MIME, common with some phone galleries) by a recognized image extension.
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'bmp', 'svg', 'tiff', 'tif', 'jfif'];
    const nameExt = (file.name.split('.').pop() || '').toLowerCase();
    const looksLikeImage = file.type.startsWith('image/') || IMAGE_EXTS.includes(nameExt);
    if (!looksLikeImage) {
      return NextResponse.json({ error: 'Please upload an image file.' }, { status: 400 });
    }

    // Validate file size (max 15MB — phone photos can be large)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Image too large. Maximum 15MB.' }, { status: 400 });
    }

    // Derive a clean extension
    let ext = MIME_EXT[file.type.toLowerCase()];
    if (!ext) {
      const raw = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      ext = raw && raw.length <= 5 ? raw : 'img';
    }

    const filename = `${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    // Saves to Netlify Blobs in production, or public/uploads locally
    const url = await saveImage(filename, bytes, file.type);

    return NextResponse.json({ url, filename }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
