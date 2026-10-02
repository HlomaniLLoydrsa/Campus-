// Environment-aware file storage.
// On Netlify → Netlify Blobs (persistent, zero-config). Locally → public/uploads on disk.
// The served URL is ALWAYS /api/uploads/<filename> regardless of environment, so stored
// URLs are portable — a URL written locally works the same way when deployed to Netlify.

import path from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';

// Detect Netlify at runtime. We check several env vars because the exact one available
// depends on which Netlify runtime (build, serverless function, edge) is running.
const IS_NETLIFY = !!(
  process.env.NETLIFY ||
  process.env.NETLIFY_LOCAL ||
  process.env.NETLIFY_BLOBS_CONTEXT ||
  process.env.NETLIFY_SITE_ID
);

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function saveImage(filename: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  if (IS_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('uploads');
    await store.set(filename, bytes, { metadata: { contentType } });
  } else {
    // Local dev: write to public/uploads on disk so the API route can read it back.
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, filename), Buffer.from(bytes));
  }
  // Always return the API-route URL — consistent in all environments.
  return `/api/uploads/${filename}`;
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
