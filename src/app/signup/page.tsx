'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const { user, isLoading, signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '', course: '', faculty: '', yearOfStudy: 1 });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.username.trim()) { setError('Username is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    const result = await signup({
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      course: form.course.trim(),
      faculty: form.faculty.trim(),
      yearOfStudy: form.yearOfStudy,
    });
    setLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Signup failed');
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the campus community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="input-field" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Username *</label>
            <input type="text" value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="your_username" className="input-field" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@university.ac.za" className="input-field" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password *</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" className="input-field pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Eye size={18} /></button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Confirm Password *</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Re-enter password" className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Course</label>
              <input type="text" value={form.course} onChange={(e) => setForm(p => ({ ...p, course: e.target.value }))} placeholder="e.g. CS" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Faculty</label>
              <input type="text" value={form.faculty} onChange={(e) => setForm(p => ({ ...p, faculty: e.target.value }))} placeholder="e.g. Engineering" className="input-field" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Year of Study</label>
            <select value={form.yearOfStudy} onChange={(e) => setForm(p => ({ ...p, yearOfStudy: parseInt(e.target.value) }))} className="input-field">
              <option value={1}>Year 1</option><option value={2}>Year 2</option><option value={3}>Year 3</option>
              <option value={4}>Year 4</option><option value={5}>Year 5</option><option value={6}>Year 6</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 mt-2">
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link href="/login" className="text-campus-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
