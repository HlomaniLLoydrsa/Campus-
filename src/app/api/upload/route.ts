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
  'image/tiff': 'tiff',
  // Audio (voice notes). webm is what MediaRecorder produces on most browsers;
  // mp4/m4a on Safari/iOS. ogg/mpeg included for completeness.
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
};

const AUDIO_EXTS = ['webm', 'ogg', 'm4a', 'mp3', 'wav', 'mp4', 'aac', 'oga'];

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

    // Accept ANY raster image — by MIME type, or (when the browser sends a generic/blank
    // MIME, common with some phone galleries) by a recognized image extension.
    // Also accept audio (voice notes) for chat messages.
    // NOTE: SVG is intentionally rejected. SVGs can carry <script> and, served inline,
    // become a stored-XSS vector. Everything user-facing needs only raster images anyway.
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'jfif'];
    const nameExt = (file.name.split('.').pop() || '').toLowerCase();
    const isSvg = file.type === 'image/svg+xml' || nameExt === 'svg';
    const looksLikeImage = !isSvg && (file.type.startsWith('image/') || IMAGE_EXTS.includes(nameExt));
    const looksLikeAudio = file.type.startsWith('audio/') || AUDIO_EXTS.includes(nameExt);
    if (!looksLikeImage && !looksLikeAudio) {
      return NextResponse.json({ error: isSvg ? 'SVG images are not supported. Please upload a JPG, PNG, or similar.' : 'Unsupported file type. Please upload an image or voice note.' }, { status: 400 });
    }

    // Size caps: images can be large phone photos (15MB); voice notes are small (10MB is
    // generous for a few minutes of compressed audio).
    const maxSize = looksLikeAudio ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: looksLikeAudio ? 'Voice note too large. Maximum 10MB.' : 'Image too large. Maximum 15MB.' }, { status: 400 });
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
