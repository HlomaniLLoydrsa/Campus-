import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { saveImage } from '@/lib/storage';
import { requireUserId } from '@/lib/auth';

// Allowed academic document/file types (documents + images of notes).
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'csv', 'zip', 'jpg', 'jpeg', 'png', 'webp', 'heic'];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB for study materials

// POST /api/academy/upload — upload a study-material file (auth required).
// Reuses the same storage backend as image uploads (Netlify Blobs / disk).
export async function POST(request: Request) {
  try {
    const auth = await requireUserId();
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 25MB.' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext || !ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ error: 'Unsupported file type. Allowed: PDF, Word, PowerPoint, Excel, text, images, zip.' }, { status: 400 });
    }

    const filename = `${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const url = await saveImage(filename, bytes, file.type || 'application/octet-stream');

    return NextResponse.json({ url, filename, fileType: ext, fileSize: file.size }, { status: 201 });
  } catch (error) {
    console.error('Academy upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
