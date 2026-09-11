'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { PrivacySettings } from '@/types';

const DEFAULTS: PrivacySettings = {
  showProfile: 'everyone', showInterests: 'everyone', allowRequests: 'everyone',
  allowMessages: 'connections-only', showOnlineStatus: true, showRelationship: false,
};

export default function PrivacySettingsPage() {
  const { currentUser } = useApp();
  const { toast } = useFeedback();
  const router = useRouter();
  const [prefs, setPrefs] = useState<PrivacySettings>({ ...DEFAULTS, ...(currentUser.privacySettings || {}) });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) =>
    setPrefs(p => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacySettings: prefs }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || 'Could not save privacy settings', 'error');
        setSaving(false);
        return;
      }
      // Persist to the local session copy so it survives reloads.
      const stored = localStorage.getItem('campus_user');
      if (stored) { const u = JSON.parse(stored); u.privacySettings = prefs; localStorage.setItem('campus_user', JSON.stringify(u)); }
      toast('Privacy settings saved', 'success');
      setSaving(false);
    } catch {
      toast('Network error', 'error');
      setSaving(false);
    }
  };

  const Choice = ({ label, desc, value, options, onChange }: {
    label: string; desc: string; value: string; options: { value: string; label: string }[];
    onChange: (v: any) => void;
  }) => (
    <div className="card p-4">
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs text-gray-500 mb-3">{desc}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${value === o.value ? 'bg-campus-primary text-white border-campus-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="card p-4 flex items-center gap-3">
      <div className="flex-1"><p className="font-medium text-sm">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-all shrink-0 ${value ? 'bg-campus-primary' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
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
              <h1 className="text-2xl font-bold gradient-text">Privacy</h1>
              <p className="text-sm text-gray-500">Control who sees your content</p>
            </div>
          </div>

          <div className="space-y-3">
            <Choice
              label="Who can see your profile" desc="Your bio, course and faculty."
              value={prefs.showProfile}
              options={[{ value: 'everyone', label: 'Everyone' }, { value: 'connections', label: 'Connections' }, { value: 'nobody', label: 'Nobody' }]}
              onChange={(v) => set('showProfile', v)}
            />
            <Choice
              label="Who can see your interests" desc="Your interests and hobbies."
              value={prefs.showInterests}
              options={[{ value: 'everyone', label: 'Everyone' }, { value: 'connections', label: 'Connections' }, { value: 'nobody', label: 'Nobody' }]}
              onChange={(v) => set('showInterests', v)}
            />
            <Choice
              label="Who can send you requests" desc="Connection and friend requests."
              value={prefs.allowRequests}
              options={[{ value: 'everyone', label: 'Everyone' }, { value: 'connections-of-connections', label: 'Friends of friends' }, { value: 'nobody', label: 'Nobody' }]}
              onChange={(v) => set('allowRequests', v)}
            />
            <Toggle label="Show online status" desc="Let others see when you're active." value={prefs.showOnlineStatus} onChange={(v) => set('showOnlineStatus', v)} />
            <Toggle label="Show relationship status" desc="Display your relationship on your profile." value={prefs.showRelationship} onChange={(v) => set('showRelationship', v)} />
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full mt-6 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
