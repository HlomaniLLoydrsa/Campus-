'use client';

import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import Avatar from '@/components/Avatar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { MapPin, LogOut, Clock, Users } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

// Must match CAMPUS_LOCATIONS in src/app/api/presence/route.ts.
const LOCATIONS: { name: string; emoji: string; gradient: string }[] = [
  { name: 'Library', emoji: '📚', gradient: 'from-amber-400 to-orange-500' },
  { name: 'Main Cafeteria', emoji: '🍔', gradient: 'from-red-400 to-rose-500' },
  { name: 'Student Center', emoji: '🏛️', gradient: 'from-blue-400 to-indigo-500' },
  { name: 'Gym', emoji: '💪', gradient: 'from-emerald-400 to-green-500' },
  { name: 'Lecture Halls', emoji: '🎓', gradient: 'from-violet-400 to-purple-500' },
  { name: 'Computer Labs', emoji: '💻', gradient: 'from-cyan-400 to-sky-500' },
  { name: 'Sports Field', emoji: '⚽', gradient: 'from-lime-400 to-green-500' },
  { name: 'Res / Dorms', emoji: '🏠', gradient: 'from-pink-400 to-fuchsia-500' },
  { name: 'Coffee Shop', emoji: '☕', gradient: 'from-yellow-500 to-amber-600' },
  { name: 'Study Lounge', emoji: '📖', gradient: 'from-teal-400 to-cyan-500' },
  { name: 'Quad / Lawn', emoji: '🌳', gradient: 'from-green-400 to-emerald-500' },
  { name: 'Off Campus', emoji: '🚗', gradient: 'from-slate-400 to-gray-500' },
];

const emojiFor = (name: string) => LOCATIONS.find(l => l.name === name)?.emoji || '📍';

export default function MapPage() {
  const { myPresence, friendsPresence, setPresenceLocation, clearPresence } = useApp();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  // Group checked-in friends by their location.
  const byLocation = useMemo(() => {
    const map: Record<string, typeof friendsPresence> = {};
    for (const f of friendsPresence) {
      (map[f.location] ||= []).push(f);
    }
    return map;
  }, [friendsPresence]);

  const totalFriendsAround = friendsPresence.length;

  const handleCheckIn = async (location: string) => {
    if (busy) return;
    setBusy(location);
    if (myPresence?.location === location) {
      await clearPresence();
      toast(`Checked out of ${location}`);
    } else {
      const ok = await setPresenceLocation(location);
      toast(ok ? `You're now at ${location} 📍` : 'Could not check in — try again');
    }
    setBusy(null);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><MapPin className="text-campus-accent" /> Vybe Map</h1>
            <p className="text-sm text-gray-500 mt-1">See which friends are around campus right now. Check in to show where you are.</p>
          </div>

          {/* Current status */}
          <div className="card p-5 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            {myPresence ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-2xl flex-shrink-0">{emojiFor(myPresence.location)}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">You're at {myPresence.location}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Checked in {formatTimeAgo(myPresence.updatedAt)} · auto-expires in ~2h</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCheckIn(myPresence.location)}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-red-500 text-sm font-semibold border border-red-100 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  <LogOut size={16} /> Check out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center flex-shrink-0"><MapPin size={22} className="text-campus-accent" /></div>
                <div>
                  <h3 className="font-bold text-sm">You're invisible on the map</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Tap a spot below to check in. Only your friends can see it, and it clears itself after 2 hours.</p>
                </div>
              </div>
            )}
          </div>

          {/* Who's around */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm flex items-center gap-1.5"><Users size={16} className="text-campus-accent" /> Who's around</h2>
            <span className="text-xs text-gray-400">{totalFriendsAround} friend{totalFriendsAround === 1 ? '' : 's'} checked in</span>
          </div>

          {totalFriendsAround === 0 && (
            <div className="card p-6 mb-6 text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm font-medium text-gray-700">No friends checked in right now</p>
              <p className="text-xs text-gray-500 mt-1">When your friends check in around campus, they'll pop up here. Be the first — check in below.</p>
            </div>
          )}

          {totalFriendsAround > 0 && (
            <div className="space-y-3 mb-8">
              {LOCATIONS.filter(l => byLocation[l.name]?.length).map(loc => {
                const people = byLocation[loc.name];
                return (
                  <div key={loc.name} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${loc.gradient} flex items-center justify-center text-lg`}>{loc.emoji}</div>
                      <div>
                        <p className="font-bold text-sm">{loc.name}</p>
                        <p className="text-xs text-gray-400">{people.length} here now</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {people.map(p => (
                        <div key={p.userId} className="flex items-center gap-3">
                          <Avatar src={p.avatar || undefined} name={p.name} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            {p.note ? (
                              <p className="text-xs text-gray-500 truncate">{p.note}</p>
                            ) : (
                              <p className="text-xs text-gray-400">@{p.username} · {formatTimeAgo(p.updatedAt)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Location picker */}
          <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5"><MapPin size={16} className="text-campus-accent" /> Check in somewhere</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {LOCATIONS.map(loc => {
              const active = myPresence?.location === loc.name;
              const count = byLocation[loc.name]?.length || 0;
              return (
                <button
                  key={loc.name}
                  onClick={() => handleCheckIn(loc.name)}
                  disabled={!!busy}
                  className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 disabled:opacity-60 ${
                    active
                      ? 'border-campus-accent bg-campus-accent/10 ring-2 ring-campus-accent/30'
                      : 'border-gray-100 bg-white hover:border-campus-accent/40 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${loc.gradient} flex items-center justify-center text-xl`}>{loc.emoji}</div>
                  <span className="text-[11px] font-medium text-center leading-tight text-gray-700">{loc.name}</span>
                  {count > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-campus-accent text-white text-[10px] font-bold flex items-center justify-center">{count}</span>
                  )}
                  {active && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-campus-accent bg-white px-1.5 py-0.5 rounded-full border border-campus-accent/30">HERE</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 text-center mt-6">Presence is opt-in and only visible to your friends at your university. It disappears automatically after 2 hours.</p>
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
