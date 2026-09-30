'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ age: '', gender: '', university: '', course: '', faculty: '', yearOfStudy: 1 });
  const [prefilled, setPrefilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Must be signed in to onboard; if already onboarded, skip to the app.
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/welcome'); return; }
    if (user.onboarded) { router.replace('/'); }
  }, [user, isLoading, router]);

  // Pre-fill course/faculty/year (and university if set) from what the user already
  // entered at registration, so they don't re-type. Only fields left blank need input.
  useEffect(() => {
    if (user && !prefilled) {
      setForm(p => ({
        ...p,
        course: p.course || user.course || '',
        faculty: p.faculty || user.faculty || '',
        yearOfStudy: user.yearOfStudy || p.yearOfStudy || 1,
        university: p.university || user.university || '',
      }));
      setPrefilled(true);
    }
  }, [user, prefilled]);

  const finish = async (payload: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, onboarded: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Could not save. Please try again.');
        setSaving(false);
        return;
      }
      // Keep the local session copy in sync so the profile shows the new details immediately.
      const stored = localStorage.getItem('campus_user');
      if (stored) {
        const u = JSON.parse(stored);
        Object.assign(u, { ...payload, onboarded: true });
        localStorage.setItem('campus_user', JSON.stringify(u));
      }
      window.location.href = '/';
    } catch {
      setError('Network error');
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Onboarding is required — validate the key details before continuing.
    const age = form.age ? parseInt(form.age, 10) : NaN;
    if (!form.age || !Number.isFinite(age) || age < 13 || age > 100) { setError('Please enter a valid age (13–100).'); return; }
    if (!form.gender) { setError('Please select your gender.'); return; }
    if (!form.university.trim()) { setError('Please enter your university.'); return; }
    if (!form.course.trim()) { setError('Please enter your course.'); return; }
    if (!form.faculty.trim()) { setError('Please enter your faculty.'); return; }
    finish({
      age,
      gender: form.gender.trim(),
      university: form.university.trim(),
      course: form.course.trim(),
      faculty: form.faculty.trim(),
      yearOfStudy: Number(form.yearOfStudy) || 1,
    });
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-fit"><Logo size={48} /></div>
          <h1 className="text-2xl font-bold text-gray-900">Tell us about you</h1>
          <p className="text-sm text-gray-500 mt-1">A few quick details so people can find and vibe with you. This shows on your profile.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Age</label>
              <input type="number" min={13} max={100} value={form.age} onChange={(e) => setForm(p => ({ ...p, age: e.target.value }))} placeholder="e.g. 20" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => setForm(p => ({ ...p, gender: e.target.value }))} className="input-field">
                <option value="">Select…</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">University</label>
            <input type="text" value={form.university} onChange={(e) => setForm(p => ({ ...p, university: e.target.value }))} placeholder="e.g. Nelson Mandela University" className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Course</label>
              <input type="text" value={form.course} onChange={(e) => setForm(p => ({ ...p, course: e.target.value }))} placeholder="e.g. Computer Science" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Faculty</label>
              <input type="text" value={form.faculty} onChange={(e) => setForm(p => ({ ...p, faculty: e.target.value }))} placeholder="e.g. Science" className="input-field" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Year of Study</label>
            <select value={form.yearOfStudy} onChange={(e) => setForm(p => ({ ...p, yearOfStudy: parseInt(e.target.value) }))} className="input-field">
              <option value={1}>Year 1</option><option value={2}>Year 2</option><option value={3}>Year 3</option>
              <option value={4}>Year 4</option><option value={5}>Year 5</option><option value={6}>Year 6</option>
            </select>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full py-3 disabled:opacity-50">
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
