'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import Avatar from '@/components/Avatar';
import { useApp } from '@/context/AppContext';
import { Eye, MapPin, Search, Lock, User as UserIcon, Send, Check } from 'lucide-react';

export default function ISawYouPage() {
  const { currentUser, users, sendISawYou } = useApp();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string; avatar?: string; username?: string } | null>(null);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const candidates = users
    .filter(u => u.id !== currentUser.id)
    .filter(u => !query || u.name.toLowerCase().includes(query.toLowerCase()) || (u.username || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 20);

  const handleSend = async () => {
    if (!selected || !message.trim()) return;
    setSending(true);
    const ok = await sendISawYou(selected.id, message.trim(), location.trim(), anonymous);
    setSending(false);
    if (ok) {
      setSent(true);
      setTimeout(() => {
        setSent(false); setSelected(null); setMessage(''); setLocation(''); setQuery('');
      }, 1800);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><Eye className="text-campus-accent" /> I Saw You</h1>
            <p className="text-sm text-gray-500 mt-1">Noticed someone on campus? Send them a private note.</p>
          </div>

          {/* Hero */}
          <div className="card p-5 mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center flex-shrink-0"><Eye size={24} className="text-white" /></div>
              <div>
                <h3 className="font-bold text-sm">Missed a connection?</h3>
                <p className="text-xs text-gray-600 mt-0.5">Pick who you saw and send them a note — anonymously or as yourself. It goes straight to them, not the feed.</p>
              </div>
            </div>
          </div>

          {sent && (
            <div className="card p-4 mb-6 bg-green-50 border-green-100 flex items-center gap-2 text-green-700">
              <Check size={18} /> <span className="text-sm font-medium">Your note was sent{anonymous ? ' anonymously' : ''}!</span>
            </div>
          )}

          {/* Step 1: pick a person */}
          {!selected && (
            <div className="card p-4">
              <label className="text-sm font-semibold block mb-2">Who did you see?</label>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people..." className="input-field pl-9" />
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {candidates.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No people match your search.</p>
                ) : candidates.map(u => (
                  <button key={u.id} onClick={() => setSelected({ id: u.id, name: u.name, avatar: u.avatar, username: u.username })} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left">
                    <Avatar src={u.avatar} name={u.name} size={40} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{u.name}</p><p className="text-xs text-gray-500 truncate">@{u.username}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: write the note */}
          {selected && (
            <div className="card p-5 animate-slide-down">
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={selected.avatar} name={selected.name} size={44} />
                <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">To: {selected.name}</p><p className="text-xs text-gray-500 truncate">@{selected.username}</p></div>
                <button onClick={() => setSelected(null)} className="text-xs text-campus-primary font-medium">Change</button>
              </div>

              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I saw you at the library and wanted to say hi..." rows={4} className="input-field resize-none mb-3" />

              <div className="relative mb-3">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where? (Library, Cafeteria...) — optional" className="input-field pl-9" />
              </div>

              {/* Anonymous vs as yourself */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setAnonymous(true)} className={`p-3 rounded-xl border-2 text-left transition-all ${anonymous ? 'border-campus-accent bg-campus-accent/5' : 'border-gray-200'}`}>
                  <Lock size={16} className={anonymous ? 'text-campus-accent' : 'text-gray-400'} />
                  <p className="text-sm font-medium mt-1">Anonymous</p>
                  <p className="text-[11px] text-gray-500">They won&apos;t see your name</p>
                </button>
                <button onClick={() => setAnonymous(false)} className={`p-3 rounded-xl border-2 text-left transition-all ${!anonymous ? 'border-campus-primary bg-campus-primary/5' : 'border-gray-200'}`}>
                  <UserIcon size={16} className={!anonymous ? 'text-campus-primary' : 'text-gray-400'} />
                  <p className="text-sm font-medium mt-1">As myself</p>
                  <p className="text-[11px] text-gray-500">They&apos;ll see it&apos;s you</p>
                </button>
              </div>

              <button onClick={handleSend} disabled={!message.trim() || sending} className="btn-accent w-full disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={16} /> {sending ? 'Sending…' : `Send${anonymous ? ' Anonymously' : ''}`}
              </button>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
