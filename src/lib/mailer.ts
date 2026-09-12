// Minimal transactional email sender.
//
// Uses Resend's HTTP API (https://resend.com) when RESEND_API_KEY is set — no SMTP,
// no extra npm dependency. If email isn't configured, sendEmail() returns
// { sent: false, reason: 'not-configured' } so callers can degrade gracefully
// without leaking whether an account exists.
//
// Env vars:
//   RESEND_API_KEY   — your Resend API key
//   EMAIL_FROM       — verified sender, e.g. "VYBE <no-reply@vybee.site>"

export interface SendEmailResult {
  sent: boolean;
  reason?: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: 'not-configured' };

  const from = process.env.EMAIL_FROM || 'VYBE <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Email send failed:', res.status, detail);
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { sent: false, reason: 'network' };
  }
}
