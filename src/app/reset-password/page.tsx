'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('This reset link is invalid. Please request a new one.'); return; }
    if (form.next.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.next !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not reset password'); setLoading(false); return; }
      setDone(true);
      setLoading(false);
      setTimeout(() => router.push('/login'), 2000);
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
          <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password you&apos;ll remember</p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
              Your password has been reset. Redirecting you to login...
            </div>
            <Link href="/login" className="btn-primary w-full py-3 block text-center">Go to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
            {!token && (
              <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700">
                No reset token found in the link. Please use the link from your email, or request a new one.
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">New password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={form.next} onChange={(e) => setForm(p => ({ ...p, next: e.target.value }))} placeholder="New password" className="input-field pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Confirm new password</label>
              <input type={show ? 'text' : 'password'} value={form.confirm} onChange={(e) => setForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm password" className="input-field" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading || !token} className="btn-primary w-full py-3 disabled:opacity-50">
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-campus-primary font-semibold hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
