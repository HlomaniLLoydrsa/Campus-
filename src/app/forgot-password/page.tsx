'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Something went wrong'); setLoading(false); return; }
      setEmailConfigured(d.emailConfigured !== false);
      setSent(true);
      setLoading(false);
    } catch {
      setError('Network error');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/app-bg.jpg')" }} />
      <div className="absolute inset-0 bg-gradient-to-br from-campus-dark/60 via-campus-primary/50 to-campus-secondary/60" />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 w-fit"><Logo size={56} /></div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
              If an account exists for <span className="font-medium">{email}</span>, a password reset link is on its way. Check your inbox (and spam folder).
            </div>
            {!emailConfigured && (
              <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700">
                Note: email delivery isn&apos;t set up on this deployment yet, so no email will arrive. Ask an admin to configure the mail service, or use the change-password option in Settings while logged in.
              </div>
            )}
            <Link href="/login" className="btn-primary w-full py-3 block text-center">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.ac.za" className="input-field" autoComplete="email" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Remembered it? <Link href="/login" className="text-campus-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
