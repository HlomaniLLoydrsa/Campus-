'use client';

import React, { useState } from 'react';
import { X, Check, Camera, Users, Lock, Globe } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { resizeImage } from '@/lib/image';

const NAME_MAX = 60;
const DESC_MAX = 300;

interface Friend { id: string; name: string; username?: string; avatar?: string }

export default function CreateGroupModal({
  friends,
  onClose,
  onCreate,
}: {
  friends: Friend[];
  onClose: () => void;
  onCreate: (opts: { name: string; description: string; image: string; privacy: 'private' | 'discoverable'; memberIds: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'discoverable'>('private');
  const [selected, setSelected] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    if (original.size > 20 * 1024 * 1024) { setError('Image must be under 20MB'); return; }
    setError('');
    let file = original;
    try { file = await resizeImage(original, 512, 0.85); } catch { file = original; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return '';
    try {
      const fd = new FormData(); fd.append('file', imageFile);
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
      if (r.ok) { const d = await r.json(); return d.url || ''; }
    } catch { /* ignore */ }
    return '';
  };

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) { setError('Give your group a name'); return; }
    setSaving(true);
    const image = await uploadImage();
    await onCreate({ name: name.trim(), description: description.trim(), image, privacy, memberIds: selected });
    // parent closes on success
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Create Group</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>

        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Group image */}
        <div className="flex items-center gap-3 mb-4">
          {imagePreview
            ? <img src={imagePreview} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center"><Users size={26} className="text-white" /></div>}
          <label className="btn-secondary text-sm cursor-pointer flex items-center gap-1"><Camera size={14} /> {imagePreview ? 'Change' : 'Add photo'}<input type="file" accept="image/*" onChange={handleImage} className="hidden" /></label>
        </div>

        {/* Name */}
        <label className="text-xs font-medium text-gray-600 block mb-1">Group name *</label>
        <input type="text" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="e.g. Study Squad" className="input-field mb-1" />
        <p className="text-[10px] text-gray-400 text-right mb-3">{name.length}/{NAME_MAX}</p>

        {/* Description */}
        <label className="text-xs font-medium text-gray-600 block mb-1">Description (optional)</label>
        <textarea value={description} maxLength={DESC_MAX} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What's this group about?" className="input-field resize-none mb-3" />

        {/* Privacy */}
        <label className="text-xs font-medium text-gray-600 block mb-2">Privacy</label>
        <div className="space-y-2 mb-4">
          <button type="button" onClick={() => setPrivacy('private')} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${privacy === 'private' ? 'border-campus-primary bg-campus-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
            <Lock size={18} className={privacy === 'private' ? 'text-campus-primary mt-0.5' : 'text-gray-400 mt-0.5'} />
            <div><p className="text-sm font-medium">Private</p><p className="text-xs text-gray-500">Only invited or added members can access this group.</p></div>
          </button>
          <button type="button" onClick={() => setPrivacy('discoverable')} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${privacy === 'discoverable' ? 'border-campus-primary bg-campus-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
            <Globe size={18} className={privacy === 'discoverable' ? 'text-campus-primary mt-0.5' : 'text-gray-400 mt-0.5'} />
            <div><p className="text-sm font-medium">Discoverable</p><p className="text-xs text-gray-500">Other VYBE users can find this group and join.</p></div>
          </button>
        </div>

        {/* Members */}
        <p className="text-xs font-medium text-gray-600 mb-2">Add members ({selected.length} selected)</p>
        {friends.length > 0 ? (
          <div className="space-y-1 max-h-44 overflow-y-auto mb-4">
            {friends.map(f => (
              <button key={f.id} onClick={() => toggle(f.id)} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${selected.includes(f.id) ? 'bg-campus-primary/10' : 'hover:bg-gray-50'}`}>
                <Avatar src={f.avatar} name={f.name} size={36} />
                <span className="flex-1 text-left text-sm font-medium truncate">{f.name}</span>
                {selected.includes(f.id) && <Check size={16} className="text-campus-primary" />}
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400 mb-4">Connect with people first to add them to a group. You can also add members later.</p>}

        <button onClick={handleCreate} disabled={saving || !name.trim()} className="btn-primary w-full disabled:opacity-50">{saving ? 'Creating…' : 'Create Group'}</button>
      </div>
    </div>
  );
}
