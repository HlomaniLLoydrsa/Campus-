// Environment-aware image storage.
// On Netlify → Netlify Blobs (persistent). Locally → public/uploads on disk.

import path from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';

const IS_NETLIFY = !!process.env.NETLIFY || !!process.env.NETLIFY_BLOBS_CONTEXT;

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function saveImage(filename: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  if (IS_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('uploads');
    await store.set(filename, bytes, { metadata: { contentType } });
    return `/api/uploads/${filename}`;
  }
  // Local: write to public/uploads so Next serves it directly at /uploads/<file>
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, filename), Buffer.from(bytes));
  return `/uploads/${filename}`;
}

export async function readImage(filename: string): Promise<{ data: ArrayBuffer; contentType?: string } | null> {
  if (IS_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('uploads');
    const result = await store.getWithMetadata(filename, { type: 'arrayBuffer' });
    if (!result || !result.data) return null;
    return { data: result.data as ArrayBuffer, contentType: result.metadata?.contentType as string | undefined };
  }
  try {
    const buf = await readFile(path.join(LOCAL_DIR, filename));
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
  } catch {
    return null;
  }
}
