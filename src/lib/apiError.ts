import { NextResponse } from 'next/server';

/**
 * Standard JSON error responses for API routes.
 * Logs the real error server-side (visible in host logs) but returns a friendly,
 * non-sensitive message to the client — never a stack trace or raw DB error.
 */
export function serverError(context: string, err: unknown) {
  console.error(`[API error] ${context}:`, err);
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 }
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = 'You are not authorized to do that.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = 'Not found.') {
  return NextResponse.json({ error: message }, { status: 404 });
}
