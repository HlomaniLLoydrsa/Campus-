'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useRouter } from 'next/navigation';
import { Shield, Users as UsersIcon, FileText, Flag, Trash2, Ban, RotateCcw, Search, AlertTriangle } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

type Tab = 'overview' | 'reports' | 'users' | 'posts';

interface Stats { totalUsers: number; suspendedUsers: number; totalPosts: number; pendingReports: number; totalReports: number; }
interface AdminUser { id: string; name: string; username: string; email: string; avatar: string; status: string; isAdmin: boolean; createdAt: string; lastSeen?: string; }
interface AdminPost { id: string; type: string; isAnonymous: boolean; content: string; likes: number; createdAt: string; authorName: string; ownerName: string | null; }
interface AdminReport { id: string; reporterName: string; targetType: string; targetId: string; reason: string; reasonLabel: string; description: string; status: string; createdAt: string; targetPreview: string; targetExists: boolean; }

export default function AdminPage() {
  const { currentUser } = useApp();
  const { confirm, toast } = useFeedback();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [postQuery, setPostQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Server is the source of truth: hit an admin endpoint and see if we're allowed.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/stats', { credentials: 'include' });
        if (!active) return;
        if (res.ok) { setAllowed(true); setStats(await res.json()); }
        else { setAllowed(false); }
      } catch { if (active) setAllowed(false); }
      finally { if (active) setChecking(false); }
    })();
    return () => { active = false; };
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/admin/reports?status=pending', { credentials: 'include' }); if (r.ok) setReports(await r.json()); } catch {}
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async (q = '') => {
    setLoading(true);
    try { const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { credentials: 'include' }); if (r.ok) setUsers(await r.json()); } catch {}
    setLoading(false);
  }, []);

  const loadPosts = useCallback(async (q = '') => {
    setLoading(true);
    try { const r = await fetch(`/api/admin/posts?q=${encodeURIComponent(q)}`, { credentials: 'include' }); if (r.ok) setPosts(await r.json()); } catch {}
    setLoading(false);
  }, []);

  const refreshStats = useCallback(async () => {
    try { const r = await fetch('/api/admin/stats', { credentials: 'include' }); if (r.ok) setStats(await r.json()); } catch {}
  }, []);

  useEffect(() => {
    if (!allowed) return;
    if (tab === 'reports') loadReports();
    if (tab === 'users') loadUsers(userQuery);
    if (tab === 'posts') loadPosts(postQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, allowed]);

  // ── Report actions ──
  const actReport = async (reportId: string, action: 'resolve' | 'dismiss' | 'deleteTarget') => {
    if (action === 'deleteTarget') {
      const ok = await confirm({ title: 'Delete reported content?', message: 'This permanently removes the reported item. This cannot be undone.', confirmText: 'Delete', destructive: true });
      if (!ok) return;
    }
    try {
      const r = await fetch('/api/admin/reports', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId, action }) });
      if (r.ok) { toast(action === 'dismiss' ? 'Report dismissed' : 'Report resolved', 'success'); setReports(prev => prev.filter(x => x.id !== reportId)); refreshStats(); }
      else toast('Action failed', 'error');
    } catch { toast('Network error', 'error'); }
  };

  // ── User actions ──
  const actUser = async (u: AdminUser, action: 'suspend' | 'unsuspend' | 'delete') => {
    if (action === 'delete') {
      const ok = await confirm({ title: `Delete ${u.name}?`, message: 'This permanently removes the user and all their content. This cannot be undone.', confirmText: 'Delete user', destructive: true });
      if (!ok) return;
      try {
        const r = await fetch(`/api/admin/users?userId=${u.id}`, { method: 'DELETE', credentials: 'include' });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { toast('User deleted', 'success'); setUsers(prev => prev.filter(x => x.id !== u.id)); refreshStats(); }
        else toast(d.error || 'Delete failed', 'error');
      } catch { toast('Network error', 'error'); }
      return;
    }
    try {
      const r = await fetch('/api/admin/users', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, action }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { toast(action === 'suspend' ? 'User suspended' : 'User reinstated', 'success'); setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: d.status } : x)); refreshStats(); }
      else toast(d.error || 'Action failed', 'error');
    } catch { toast('Network error', 'error'); }
  };

  // ── Post actions ──
  const deletePost = async (p: AdminPost) => {
    const ok = await confirm({ title: 'Delete this post?', message: 'This permanently removes the post and its comments. This cannot be undone.', confirmText: 'Delete', destructive: true });
    if (!ok) return;
    try {
      const r = await fetch(`/api/admin/posts?postId=${p.id}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) { toast('Post deleted', 'success'); setPosts(prev => prev.filter(x => x.id !== p.id)); refreshStats(); }
      else toast('Delete failed', 'error');
    } catch { toast('Network error', 'error'); }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Checking access…</p></main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          <TopBar />
          <div className="max-w-md mx-auto px-4 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Shield size={28} className="text-red-600" /></div>
            <h1 className="text-xl font-bold mb-2">Admins only</h1>
            <p className="text-sm text-gray-500 mb-6">You don&apos;t have permission to view this page.</p>
            <button onClick={() => router.push('/')} className="btn-primary">Back to home</button>
          </div>
          <BottomNav />
        </main>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'reports', label: 'Reports', icon: Flag },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'posts', label: 'Posts', icon: FileText },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-campus-primary/10 flex items-center justify-center"><Shield size={20} className="text-campus-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Admin</h1>
              <p className="text-sm text-gray-500">Moderation &amp; management</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide px-1 py-1">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${active ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon size={15} /> {t.label}
                  {t.id === 'reports' && stats && stats.pendingReports > 0 && <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>{stats.pendingReports}</span>}
                </button>
              );
            })}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total users" value={stats?.totalUsers ?? 0} icon={<UsersIcon size={18} className="text-campus-primary" />} />
              <StatCard label="Suspended" value={stats?.suspendedUsers ?? 0} icon={<Ban size={18} className="text-red-600" />} />
              <StatCard label="Total posts" value={stats?.totalPosts ?? 0} icon={<FileText size={18} className="text-campus-primary" />} />
              <StatCard label="Pending reports" value={stats?.pendingReports ?? 0} icon={<Flag size={18} className="text-orange-500" />} />
            </div>
          )}

          {/* Reports */}
          {tab === 'reports' && (
            <div className="space-y-3">
              {loading ? <p className="text-sm text-gray-400 text-center py-8">Loading…</p> :
                reports.length === 0 ? <EmptyState icon={<Flag size={28} className="text-gray-300" />} text="No pending reports" /> :
                reports.map(r => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="badge-pill bg-orange-100 text-orange-700 text-xs">{r.reasonLabel}</span>
                      <span className="badge-pill bg-gray-100 text-gray-600 text-xs">{r.targetType}</span>
                      {!r.targetExists && <span className="badge-pill bg-red-100 text-red-600 text-xs">deleted</span>}
                      <span className="text-xs text-gray-400 ml-auto">{formatTimeAgo(r.createdAt)}</span>
                    </div>
                    {r.targetPreview && <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-2 line-clamp-3">{r.targetPreview}</p>}
                    {r.description && <p className="text-xs text-gray-500 mb-2"><span className="font-medium">Reporter note:</span> {r.description}</p>}
                    <p className="text-xs text-gray-400 mb-3">Reported by {r.reporterName}</p>
                    <div className="flex gap-2 flex-wrap">
                      {r.targetExists && <button onClick={() => actReport(r.id, 'deleteTarget')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"><Trash2 size={13} /> Delete content</button>}
                      <button onClick={() => actReport(r.id, 'resolve')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-campus-primary text-white">Mark resolved</button>
                      <button onClick={() => actReport(r.id, 'dismiss')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Dismiss</button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div>
              <SearchBar value={userQuery} onChange={setUserQuery} onSubmit={() => loadUsers(userQuery)} placeholder="Search name, username, or email" />
              <div className="space-y-2 mt-3">
                {loading ? <p className="text-sm text-gray-400 text-center py-8">Loading…</p> :
                  users.length === 0 ? <EmptyState icon={<UsersIcon size={28} className="text-gray-300" />} text="No users found" /> :
                  users.map(u => (
                    <div key={u.id} className="card p-3 flex items-center gap-3">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-campus-primary/10 flex items-center justify-center text-campus-primary font-bold">{(u.name || '?')[0]}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate flex items-center gap-1.5">{u.name} {u.isAdmin && <span className="badge-pill bg-campus-primary/10 text-campus-primary text-[10px]">admin</span>} {u.status === 'suspended' && <span className="badge-pill bg-red-100 text-red-600 text-[10px]">suspended</span>}</p>
                        <p className="text-xs text-gray-400 truncate">@{u.username} · {u.email}</p>
                      </div>
                      {!u.isAdmin && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          {u.status === 'suspended'
                            ? <button onClick={() => actUser(u, 'unsuspend')} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Reinstate"><RotateCcw size={15} /></button>
                            : <button onClick={() => actUser(u, 'suspend')} className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="Suspend"><Ban size={15} /></button>}
                          <button onClick={() => actUser(u, 'delete')} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Delete"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {tab === 'posts' && (
            <div>
              <SearchBar value={postQuery} onChange={setPostQuery} onSubmit={() => loadPosts(postQuery)} placeholder="Search post content" />
              <div className="space-y-2 mt-3">
                {loading ? <p className="text-sm text-gray-400 text-center py-8">Loading…</p> :
                  posts.length === 0 ? <EmptyState icon={<FileText size={28} className="text-gray-300" />} text="No posts found" /> :
                  posts.map(p => (
                    <div key={p.id} className="card p-3">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="badge-pill bg-gray-100 text-gray-600 text-xs">{p.type}</span>
                        {p.isAnonymous && <span className="badge-pill bg-purple-100 text-purple-700 text-xs">anonymous</span>}
                        <span className="text-xs text-gray-400 ml-auto">{formatTimeAgo(p.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">{p.content || <span className="text-gray-400 italic">No text</span>}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          by {p.authorName}
                          {p.isAnonymous && p.ownerName && <span className="text-gray-500"> (really {p.ownerName})</span>}
                        </p>
                        <button onClick={() => deletePost(p)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <BottomNav />
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function SearchBar({ value, onChange, onSubmit, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
        placeholder={placeholder}
        className="input-field pl-9"
      />
    </div>
  );
}
