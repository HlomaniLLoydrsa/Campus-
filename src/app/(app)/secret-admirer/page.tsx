'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { Heart, Eye, EyeOff, Shield, Send, X, Sparkles } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function SecretAdmirerPage() {
  const { currentUser, secretAdmirers, sendSecretAdmirer, respondToAdmirer, users, getUserById } = useApp();
  const [showSend, setShowSend] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [message, setMessage] = useState('');

  const receivedAdmirers = secretAdmirers.filter(sa => sa.toUserId === currentUser.id);
  const sentAdmirers = secretAdmirers.filter(sa => sa.fromUserId === currentUser.id);

  const handleSend = () => {
    if (selectedUser && message.trim()) {
      sendSecretAdmirer(selectedUser, message.trim());
      setShowSend(false);
      setSelectedUser('');
      setMessage('');
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Heart className="text-campus-accent" /> Secret Admirer
            </h1>
            <p className="text-sm text-gray-500 mt-1">Send anonymous appreciation to someone special</p>
          </div>

          {/* Hero card */}
          <div className="card p-6 mb-6 bg-gradient-to-r from-pink-50 to-red-50 border-pink-100 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-red-400 flex items-center justify-center mx-auto mb-3">
              <Heart size={32} className="text-white" fill="white" />
            </div>
            <h2 className="font-bold text-lg mb-1">Secret Admirer</h2>
            <p className="text-sm text-gray-600 mb-4">Anonymously let someone know you appreciate them. Their identity stays hidden until both parties consent to reveal.</p>
            <button
              onClick={() => setShowSend(!showSend)}
              className="btn-accent inline-flex items-center gap-2"
            >
              <Send size={16} /> Send to Someone
            </button>
          </div>

          {/* Send form */}
          {showSend && (
            <div className="card p-5 mb-6 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Send a Secret Admirer Message</h3>
                <button onClick={() => setShowSend(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Who do you admire?</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select someone...</option>
                    {users.filter(u => u.id !== currentUser.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Your message (they won&apos;t know who sent it)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="I think you're really cool because..."
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl text-xs text-yellow-700">
                  <Shield size={14} className="flex-shrink-0" />
                  Your identity will NOT be revealed unless both of you consent
                </div>
                <button
                  onClick={handleSend}
                  disabled={!selectedUser || !message.trim()}
                  className="btn-accent w-full disabled:opacity-50"
                >
                  Send Anonymously
                </button>
              </div>
            </div>
          )}

          {/* Received admirers */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">Your Secret Admirers</h3>
            {receivedAdmirers.length > 0 ? (
              <div className="space-y-3">
                {receivedAdmirers.map(admirer => {
                  const revealedSender = admirer.status === 'revealed' ? getUserById(admirer.fromUserId) : null;
                  return (
                  <div key={admirer.id} className="card p-5 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
                        <span className="text-white text-xl">{admirer.status === 'revealed' ? '💘' : '👀'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{admirer.status === 'revealed' ? 'Secret Admirer Revealed!' : 'You have a Secret Admirer!'}</p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(admirer.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-white/80 rounded-xl p-3 mb-4 italic">&quot;{admirer.message}&quot;</p>

                    {admirer.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => respondToAdmirer(admirer.id, 'curious')} className="btn-primary text-sm flex items-center justify-center gap-1"><Eye size={14} /> I&apos;m Curious</button>
                        <button onClick={() => respondToAdmirer(admirer.id, 'ignored')} className="btn-secondary text-sm flex items-center justify-center gap-1"><EyeOff size={14} /> Ignore</button>
                      </div>
                    )}
                    {admirer.status === 'curious' && (
                      <div>
                        <div className="p-3 bg-campus-primary/10 rounded-xl text-center mb-2">
                          <Sparkles size={16} className="inline text-campus-primary mb-1" />
                          <p className="text-sm font-medium text-campus-primary">You&apos;re curious! Reveal to see who it is (they must agree too).</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => respondToAdmirer(admirer.id, 'reveal')} className="btn-accent text-sm flex items-center justify-center gap-1"><Eye size={14} /> Reveal</button>
                          <button onClick={() => respondToAdmirer(admirer.id, 'blocked')} className="btn-secondary text-sm flex items-center justify-center gap-1"><Shield size={14} /> Block</button>
                        </div>
                      </div>
                    )}
                    {admirer.status === 'revealed' && (
                      <div className="p-3 bg-green-50 rounded-xl flex items-center gap-3">
                        <div className="flex-shrink-0">{revealedSender?.avatar ? <img src={revealedSender.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">{(revealedSender?.name || '?')[0]}</div>}</div>
                        <div className="flex-1"><p className="text-sm font-medium text-green-700">It was {revealedSender?.name || 'someone'}!</p>{revealedSender && <a href={`/profile/${revealedSender.id}`} className="text-xs text-green-600 underline">View profile</a>}</div>
                      </div>
                    )}
                    {admirer.status === 'ignored' && <p className="text-xs text-gray-400 text-center">You ignored this admirer</p>}
                    {admirer.status === 'blocked' && <p className="text-xs text-red-400 text-center">Blocked</p>}
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Heart size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No secret admirers yet</p>
                <p className="text-xs text-gray-400 mt-1">Someone might be thinking of you right now...</p>
              </div>
            )}
          </div>

          {/* Sent */}
          {sentAdmirers.length > 0 && (
            <div>
              <h3 className="font-bold mb-3">Sent by You</h3>
              <div className="space-y-3">
                {sentAdmirers.map(admirer => {
                  const revealedTo = admirer.status === 'revealed' ? getUserById(admirer.toUserId) : null;
                  return (
                  <div key={admirer.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Secret message sent</p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(admirer.createdAt)}</p>
                      </div>
                      <span className={`badge-pill ${
                        admirer.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        admirer.status === 'curious' ? 'bg-purple-100 text-purple-700' :
                        admirer.status === 'revealed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {admirer.status}
                      </span>
                    </div>
                    {admirer.status === 'curious' && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl">
                        <p className="text-xs text-purple-700 mb-2">They&apos;re curious about you! Reveal your identity?</p>
                        <button onClick={() => respondToAdmirer(admirer.id, 'reveal')} className="btn-accent text-xs flex items-center gap-1"><Eye size={12} /> Reveal myself</button>
                      </div>
                    )}
                    {admirer.status === 'revealed' && revealedTo && (
                      <p className="text-xs text-green-600 mt-2">{revealedTo.name} now knows it was you 💘</p>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
