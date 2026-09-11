'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { Sparkles, Heart, Shield, Check, X, ArrowRight, Users, MessageCircle } from 'lucide-react';

export default function WingmanPage() {
  return <Suspense fallback={null}><WingmanContent /></Suspense>;
}

function WingmanContent() {
  const { currentUser, wingmanSuggestions, users, connections, getUserById, sendWingmanSuggestion, respondToWingman, getOrCreateDirectConversation } = useApp();
  const { toast } = useFeedback();
  const searchParams = useSearchParams();
  const router = useRouter();
  const focusSuggestionId = searchParams.get('suggestion');
  const [isEnabled, setIsEnabled] = useState(currentUser.wingmanEnabled);
  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState('');
  const [reason, setReason] = useState('');

  const myFriends = (connections[currentUser.id] || []).map(id => getUserById(id)).filter(Boolean);
  // Suggestions where I'm the person suggested-for OR the person being suggested — both parties should see it.
  const involvesMe = (s: any) => s.forUserId === currentUser.id || s.suggestedUserId === currentUser.id;
  const mySuggestions = wingmanSuggestions.filter(s => involvesMe(s) && s.status === 'pending');
  const myMissions = wingmanSuggestions.filter(s => s.wingmanId === currentUser.id);
  // The specific suggestion opened from a notification (any status).
  const focusSuggestion = focusSuggestionId ? wingmanSuggestions.find(s => s.id === focusSuggestionId) : null;

  const handleSendSuggestion = () => {
    if (selectedFriend && selectedSuggestion && reason.trim()) {
      sendWingmanSuggestion(selectedFriend, selectedSuggestion, reason.trim());
      toast('Suggestion sent 🏹');
      setShowSuggest(false);
      setSelectedFriend('');
      setSelectedSuggestion('');
      setReason('');
    }
  };

  const handleRespond = (id: string, action: 'accepted' | 'rejected') => {
    respondToWingman(id, action);
    toast(action === 'accepted' ? "You're connected — start chatting!" : 'Suggestion passed');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><Sparkles className="text-campus-primary" /> Wingman Mode</h1>
            <p className="text-sm text-gray-500 mt-1">Let your friends help you make connections</p>
          </div>

          {/* Focused suggestion opened from a notification */}
          {focusSuggestion && (() => {
            const wingman = getUserById(focusSuggestion.wingmanId);
            // Show the OTHER person (whoever I'm not).
            const otherId = focusSuggestion.forUserId === currentUser.id ? focusSuggestion.suggestedUserId : focusSuggestion.forUserId;
            const other = getUserById(otherId);
            const canRespond = focusSuggestion.forUserId === currentUser.id && focusSuggestion.status === 'pending';
            const statusMeta = focusSuggestion.status === 'accepted' ? { label: 'Accepted', cls: 'bg-green-100 text-green-700' } : focusSuggestion.status === 'rejected' ? { label: 'Passed', cls: 'bg-gray-100 text-gray-500' } : { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
            if (!other) return null;
            return (
              <div className="card p-5 mb-6 border-campus-primary/20 ring-2 ring-campus-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Sparkles size={13} className="text-campus-primary" /> Wingman suggestion from {wingman?.name || 'a friend'}</span>
                  <span className={`badge-pill text-[10px] ${statusMeta.cls}`}>{statusMeta.label}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  {other.avatar ? <img src={other.avatar} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-campus-primary/20" /> : <div className="w-16 h-16 rounded-full bg-campus-primary/10 flex items-center justify-center text-campus-primary font-bold text-xl ring-2 ring-campus-primary/20">{(other.name || '?')[0]}</div>}
                  <div className="min-w-0">
                    <p className="font-bold">{other.name}</p>
                    <p className="text-xs text-gray-500">{[other.course, other.yearOfStudy && `Year ${other.yearOfStudy}`].filter(Boolean).join(' · ')}</p>
                    <div className="flex flex-wrap gap-1 mt-1">{(other.interests || []).slice(0, 3).map(i => <span key={i} className="badge-pill bg-gray-100 text-gray-600 text-[10px]">{i}</span>)}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3 italic">&quot;{focusSuggestion.reason}&quot;</p>
                {canRespond ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleRespond(focusSuggestion.id, 'accepted')} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Check size={14} /> Accept &amp; connect</button>
                    <button onClick={() => handleRespond(focusSuggestion.id, 'rejected')} className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"><X size={14} /> Pass</button>
                  </div>
                ) : focusSuggestion.status === 'accepted' ? (
                  <button onClick={() => { const c = getOrCreateDirectConversation(otherId); if (c) router.push('/messages'); }} className="btn-primary w-full text-sm flex items-center justify-center gap-1"><MessageCircle size={14} /> Message {other.name.split(' ')[0]}</button>
                ) : (
                  <p className="text-xs text-gray-400 text-center">{focusSuggestion.suggestedUserId === currentUser.id ? `Waiting for ${getUserById(focusSuggestion.forUserId)?.name || 'them'} to respond` : 'This suggestion is closed'}</p>
                )}
                <button onClick={() => router.push('/wingman')} className="text-xs text-gray-400 hover:text-campus-primary mt-3 block mx-auto">View all suggestions</button>
              </div>
            );
          })()}

          {/* Toggle */}
          <div className="card p-5 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center"><Sparkles size={24} className="text-white" /></div>
                <div><h3 className="font-bold">Wingman Mode</h3><p className="text-xs text-gray-600">Allow trusted friends to suggest connections</p></div>
              </div>
              <button onClick={() => { const v = !isEnabled; setIsEnabled(v); fetch(`/api/users/${currentUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wingmanEnabled: v }) }).catch(() => {}); }} className={`w-14 h-7 rounded-full transition-all ${isEnabled ? 'bg-campus-primary' : 'bg-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {!isEnabled ? (
            <div className="card p-8 text-center"><Shield size={48} className="mx-auto text-gray-300 mb-3" /><h3 className="font-semibold text-gray-700">Wingman Mode is Off</h3><p className="text-sm text-gray-500 mt-1">Enable it to let your friends play matchmaker</p></div>
          ) : (
            <>
              {/* Dashboard cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="card p-4 text-center"><p className="text-2xl mb-1">🏹</p><p className="font-bold text-lg">{mySuggestions.length}</p><p className="text-xs text-gray-500">Pending suggestions</p></div>
                <div className="card p-4 text-center"><p className="text-2xl mb-1">🎯</p><p className="font-bold text-lg">{myMissions.length}</p><p className="text-xs text-gray-500">Your missions</p></div>
              </div>

              {/* Wingmen */}
              <div className="card p-4 mb-6">
                <h3 className="font-semibold text-sm mb-3">Your Wingmen</h3>
                <div className="flex gap-3 flex-wrap">
                  {currentUser.wingmen.length > 0 ? currentUser.wingmen.map(wId => {
                    const wingman = getUserById(wId);
                    if (!wingman) return null;
                    return (
                      <div key={wId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                        {wingman.avatar ? <img src={wingman.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-campus-primary/10 flex items-center justify-center text-campus-primary text-xs font-bold">{(wingman.name || '?')[0]}</div>}
                        <span className="text-sm font-medium">{wingman.name.split(' ')[0]}</span>
                      </div>
                    );
                  }) : <p className="text-xs text-gray-400">No wingmen yet. Add trusted friends!</p>}
                </div>
              </div>

              {/* Suggest for a friend */}
              <button onClick={() => setShowSuggest(!showSuggest)} className="card p-4 w-full mb-6 text-left hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Heart size={20} className="text-campus-accent" /><span className="font-semibold text-sm">Suggest someone for a friend</span></div>
                  <ArrowRight size={16} className="text-gray-400" />
                </div>
              </button>

              {showSuggest && (
                <div className="card p-4 mb-6 animate-slide-down">
                  <h3 className="font-semibold text-sm mb-3">Make a Wingman Suggestion</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Suggest for</label>
                      <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)} className="input-field">
                        <option value="">Select a friend...</option>
                        {myFriends.map(f => f && <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Suggest this person</label>
                      <select value={selectedSuggestion} onChange={(e) => setSelectedSuggestion(e.target.value)} className="input-field">
                        <option value="">Select a person...</option>
                        {users.filter(u => u.id !== currentUser.id && u.id !== selectedFriend).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Why would they vibe?</label>
                      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="They both love hiking and have similar taste in music..." rows={2} className="input-field resize-none" />
                    </div>
                    <button onClick={handleSendSuggestion} disabled={!selectedFriend || !selectedSuggestion || !reason.trim()} className="btn-primary w-full text-sm disabled:opacity-50">Send Suggestion</button>
                  </div>
                </div>
              )}

              {/* Suggestions for me */}
              <div className="space-y-4">
                <h3 className="font-semibold">Suggestions for you</h3>
                {mySuggestions.length > 0 ? mySuggestions.map(suggestion => {
                  const wingman = getUserById(suggestion.wingmanId);
                  // Show the OTHER person (whoever the current user is not).
                  const otherId = suggestion.forUserId === currentUser.id ? suggestion.suggestedUserId : suggestion.forUserId;
                  const otherUser = getUserById(otherId);
                  const canRespond = suggestion.forUserId === currentUser.id;
                  if (!wingman || !otherUser) return null;
                  return (
                    <div key={suggestion.id} className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {wingman.avatar ? <img src={wingman.avatar} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-campus-primary/10 flex items-center justify-center text-campus-primary text-[10px] font-bold">{(wingman.name || '?')[0]}</div>}
                        <p className="text-xs text-gray-500">{wingman.name} thinks you&apos;d vibe with</p>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        {otherUser.avatar ? <img src={otherUser.avatar} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-campus-primary/20" /> : <div className="w-14 h-14 rounded-full bg-campus-primary/10 flex items-center justify-center text-campus-primary font-bold ring-2 ring-campus-primary/20">{(otherUser.name || '?')[0]}</div>}
                        <div>
                          <p className="font-semibold">{otherUser.name}</p>
                          <p className="text-xs text-gray-500">{otherUser.course} · Year {otherUser.yearOfStudy}</p>
                          <div className="flex gap-1 mt-1">{(otherUser.interests || []).slice(0, 3).map(i => <span key={i} className="badge-pill bg-gray-100 text-gray-600 text-[10px]">{i}</span>)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3 italic">&quot;{suggestion.reason}&quot;</p>
                      {canRespond ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleRespond(suggestion.id, 'accepted')} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Check size={14} /> Interested</button>
                          <button onClick={() => handleRespond(suggestion.id, 'rejected')} className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"><X size={14} /> Pass</button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center">Waiting for {getUserById(suggestion.forUserId)?.name || 'them'} to respond</p>
                      )}
                    </div>
                  );
                }) : (
                  <div className="card p-8 text-center"><Sparkles size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 text-sm">No suggestions yet</p><p className="text-xs text-gray-400 mt-1">Your wingmen will suggest people they think you&apos;d like</p></div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
