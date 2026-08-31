'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import PostCard from '@/components/posts/PostCard';
import { useApp } from '@/context/AppContext';
import { Edit2, FileText, Bookmark, Award, MapPin, BookOpen, Calendar, Users, MessageCircle, Camera, X, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { currentUser, posts, connections, users, getOrCreateDirectConversation, badges } = useApp();
  const [activeTab, setActiveTab] = useState<'posts' | 'friends' | 'saved' | 'badges'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();

  const earnedBadges = badges.filter(b => b.earned);
  const myPosts = posts.filter(p => p.authorId === currentUser.id && !p.isAnonymous);
  const savedPosts = posts.filter(p => p.savedBy.includes(currentUser.id));
  const friendCount = connections[currentUser.id]?.length || 0;
  const myFriends = (connections[currentUser.id] || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  const hasProfile = currentUser.name && currentUser.username;

  const handleMessage = (userId: string) => { const c = getOrCreateDirectConversation(userId); if (c) router.push('/messages'); };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto">
          <div className="relative h-48 md:h-56 w-full bg-gradient-to-r from-campus-dark via-campus-primary to-campus-secondary">
            <button onClick={() => setShowEditModal(true)} className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow hover:bg-white"><Camera size={16} className="text-gray-700" /></button>
          </div>
          <div className="px-4 -mt-16 relative pb-6">
            <div className="flex items-end gap-4">
              <div className="relative">
                {currentUser.avatar ? <img src={currentUser.avatar} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg" /> : <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center"><User size={40} className="text-gray-400" /></div>}
                <button onClick={() => setShowEditModal(true)} className="absolute bottom-1 right-1 bg-campus-primary text-white p-1.5 rounded-full shadow"><Camera size={12} /></button>
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <div><h1 className="text-xl font-bold">{currentUser.name || 'Set up your profile'}</h1>{currentUser.username && <p className="text-sm text-gray-500">@{currentUser.username}</p>}</div>
                  <button onClick={() => setShowEditModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Edit2 size={14} /> Edit Profile</button>
                </div>
              </div>
            </div>
            {!hasProfile && <div className="mt-4 p-4 bg-campus-primary/5 border border-campus-primary/10 rounded-xl text-center"><p className="text-sm font-medium text-campus-primary">Complete your profile to get started!</p><button onClick={() => setShowEditModal(true)} className="btn-primary text-sm mt-3">Set Up Profile</button></div>}
            {currentUser.bio && <p className="text-sm text-gray-700 mt-4">{currentUser.bio}</p>}
            {(currentUser.course || currentUser.faculty) && <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">{currentUser.course && <span className="flex items-center gap-1"><BookOpen size={14} /> {currentUser.course}</span>}{currentUser.faculty && <span className="flex items-center gap-1"><MapPin size={14} /> {currentUser.faculty}</span>}{currentUser.yearOfStudy > 0 && <span className="flex items-center gap-1"><Calendar size={14} /> Year {currentUser.yearOfStudy}</span>}</div>}
            <div className="flex gap-6 mt-4 py-4 border-y border-gray-100"><div className="text-center"><p className="font-bold text-lg">{friendCount}</p><p className="text-xs text-gray-500">Friends</p></div><div className="text-center"><p className="font-bold text-lg">{myPosts.length}</p><p className="text-xs text-gray-500">Posts</p></div><div className="text-center"><p className="font-bold text-lg">{earnedBadges.length}</p><p className="text-xs text-gray-500">Badges</p></div></div>
            {currentUser.interests.length > 0 && <div className="mt-4"><h3 className="text-sm font-semibold text-gray-700 mb-2">Interests</h3><div className="flex flex-wrap gap-2">{currentUser.interests.map(i => <span key={i} className="badge-pill bg-campus-primary/10 text-campus-primary">{i}</span>)}</div></div>}
            <div className="flex gap-1 mt-6 border-b border-gray-100 overflow-x-auto scrollbar-hide">
              {([{ key: 'posts', label: 'Posts', icon: FileText }, { key: 'friends', label: 'Friends', icon: Users }, { key: 'saved', label: 'Saved', icon: Bookmark }, { key: 'badges', label: 'Badges', icon: Award }] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.key ? 'border-campus-primary text-campus-primary' : 'border-transparent text-gray-500'}`}><tab.icon size={16} /> {tab.label}</button>
              ))}
            </div>
            <div className="py-4 space-y-4">
              {activeTab === 'posts' && (myPosts.length > 0 ? myPosts.map(p => <PostCard key={p.id} post={p} />) : <div className="text-center py-8 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No posts yet</p></div>)}
              {activeTab === 'friends' && (myFriends.length > 0 ? <div className="space-y-3">{myFriends.map(u => u && <div key={u.id} className="card p-4"><div className="flex items-center gap-3"><Link href={`/profile/${u.id}`}>{u.avatar ? <img src={u.avatar} alt="" className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center"><User size={18} className="text-gray-400" /></div>}</Link><div className="flex-1 min-w-0"><Link href={`/profile/${u.id}`} className="font-semibold text-sm hover:text-campus-primary">{u.name}</Link><p className="text-xs text-gray-500">@{u.username}</p></div><button onClick={() => handleMessage(u.id)} className="btn-primary text-xs flex items-center gap-1"><MessageCircle size={12} /> Message</button></div></div>)}</div> : <div className="text-center py-8 text-gray-400"><Users size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No friends yet</p></div>)}
              {activeTab === 'saved' && (savedPosts.length > 0 ? savedPosts.map(p => <PostCard key={p.id} post={p} />) : <div className="text-center py-8 text-gray-400"><Bookmark size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No saved posts</p></div>)}
              {activeTab === 'badges' && (
                badges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {badges.map(b => (
                      <div key={b.id} className={`card p-4 text-center transition-all ${b.earned ? '' : 'opacity-40 grayscale'}`}>
                        <p className="text-3xl mb-2">{b.emoji}</p>
                        <p className="font-semibold text-xs">{b.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1 leading-tight">{b.description}</p>
                        {b.earned ? <span className="badge-pill bg-green-100 text-green-700 text-[9px] mt-2">Earned</span> : <span className="badge-pill bg-gray-100 text-gray-400 text-[9px] mt-2">Locked</span>}
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-8 text-gray-400"><Award size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">Use the platform to earn badges!</p></div>
              )}
            </div>
          </div>
        </div>
        {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}
      </main>
      <BottomNav />
    </div>
  );
}

function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser } = useApp();
  const [form, setForm] = useState({ name: currentUser.name || '', username: currentUser.username || '', bio: currentUser.bio || '', course: currentUser.course || '', faculty: currentUser.faculty || '', yearOfStudy: currentUser.yearOfStudy || 1, interests: currentUser.interests.join(', '), hobbies: currentUser.hobbies.join(', ') });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be less than 10MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarFile(file); setAvatarPreview(ev.target?.result as string); };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData(); fd.append('file', file);
    try { const r = await fetch('/api/upload', { method: 'POST', body: fd }); if (r.ok) { return (await r.json()).url; } } catch {} return null;
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.username.trim()) { setError('Username is required'); return; }
    setSaving(true);
    let avatarUrl = currentUser.avatar || '';
    const coverUrl = ''; // cover is a gradient, no image
    if (avatarFile) { const u = await uploadFile(avatarFile); if (u) avatarUrl = u; }
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.trim(), username: form.username.trim(), bio: form.bio.trim(), avatar: avatarUrl, coverImage: coverUrl, course: form.course.trim(), faculty: form.faculty.trim(), yearOfStudy: Number(form.yearOfStudy) || 1, interests: form.interests.split(',').map(s => s.trim()).filter(Boolean), hobbies: form.hobbies.split(',').map(s => s.trim()).filter(Boolean) }) });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); setSaving(false); return; }
      const stored = localStorage.getItem('campus_user');
      if (stored) { const u = JSON.parse(stored); Object.assign(u, { name: form.name.trim(), username: form.username.trim(), avatar: avatarUrl, coverImage: coverUrl, bio: form.bio.trim(), course: form.course.trim(), faculty: form.faculty.trim(), yearOfStudy: Number(form.yearOfStudy), interests: form.interests.split(',').map((s: string) => s.trim()).filter(Boolean), hobbies: form.hobbies.split(',').map((s: string) => s.trim()).filter(Boolean) }); localStorage.setItem('campus_user', JSON.stringify(u)); }
      window.location.reload();
    } catch { setError('Network error'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-lg">Edit Profile</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              {avatarPreview ? <img src={avatarPreview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" /> : <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300"><Camera size={24} className="text-gray-400" /></div>}
              <label className="btn-secondary text-sm cursor-pointer">Choose Photo<input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} className="hidden" /></label>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Cover</label>
            <div className="w-full h-24 rounded-xl bg-gradient-to-r from-campus-dark via-campus-primary to-campus-secondary" />
          </div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium text-gray-600 block mb-1">Name *</label><input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Your name" /></div><div><label className="text-xs font-medium text-gray-600 block mb-1">Username *</label><input type="text" value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} className="input-field" placeholder="username" /></div></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Bio</label><textarea value={form.bio} onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} className="input-field resize-none" placeholder="About you..." /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium text-gray-600 block mb-1">Course</label><input type="text" value={form.course} onChange={(e) => setForm(p => ({ ...p, course: e.target.value }))} className="input-field" /></div><div><label className="text-xs font-medium text-gray-600 block mb-1">Faculty</label><input type="text" value={form.faculty} onChange={(e) => setForm(p => ({ ...p, faculty: e.target.value }))} className="input-field" /></div></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Year</label><select value={form.yearOfStudy} onChange={(e) => setForm(p => ({ ...p, yearOfStudy: parseInt(e.target.value) }))} className="input-field"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option><option value={6}>6</option></select></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Interests (comma-separated)</label><input type="text" value={form.interests} onChange={(e) => setForm(p => ({ ...p, interests: e.target.value }))} className="input-field" placeholder="Tech, Music, Sports" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Hobbies (comma-separated)</label><input type="text" value={form.hobbies} onChange={(e) => setForm(p => ({ ...p, hobbies: e.target.value }))} className="input-field" placeholder="Coding, Basketball" /></div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </div>
    </div>
  );
}
