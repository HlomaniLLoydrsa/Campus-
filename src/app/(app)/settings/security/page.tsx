'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useFeedback } from '@/context/FeedbackContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';

export default function SecuritySettingsPage() {
  const { toast } = useFeedback();
  const router = useRouter();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (form.next.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not change password'); setSaving(false); return; }
      toast('Password updated', 'success');
      setForm({ current: '', next: '', confirm: '' });
      setSaving(false);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  };

  const Field = ({ label, k }: { label: string; k: 'current' | 'next' | 'confirm' }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <div className="relative">
        <input
          type={show[k] ? 'text' : 'password'}
          value={form[k]}
          onChange={(e) => setForm(p => ({ ...p, [k]: e.target.value }))}
          className="input-field pr-10"
          placeholder={label}
          autoComplete={k === 'current' ? 'current-password' : 'new-password'}
        />
        <button type="button" onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show[k] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-24 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => router.push('/settings')} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Security</h1>
              <p className="text-sm text-gray-500">Change your password</p>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
            <Field label="Current password" k="current" />
            <Field label="New password" k="next" />
            <Field label="Confirm new password" k="confirm" />
            <button onClick={handleSubmit} disabled={saving || !form.next || !form.confirm} className="btn-primary w-full disabled:opacity-50">{saving ? 'Saving…' : 'Update Password'}</button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
