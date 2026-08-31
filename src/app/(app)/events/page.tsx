'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { Calendar, MapPin, Users, Plus, X, Check, LogOut } from 'lucide-react';
import { formatDate, formatTime, getCategoryColor, generateId } from '@/lib/utils';

export default function EventsPage() {
  const { posts, addPost, currentUser, joinEvent, leaveEvent, getUserById } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', description: '', date: '', time: '', location: '', maxParticipants: 10, neededCount: 0, category: 'hangout', isAnonymous: false, joinType: 'direct' as 'direct' | 'approval' });

  const events = posts.filter(p => p.eventData).map(p => ({ post: p, event: p.eventData! }));

  const handleCreateEvent = () => {
    if (!eventForm.name || !eventForm.date || !eventForm.time || !eventForm.location) return;
    const newPost = {
      id: generateId(), type: 'event' as const, authorId: eventForm.isAnonymous ? null : currentUser.id, isAnonymous: eventForm.isAnonymous,
      content: eventForm.description || `Join me for: ${eventForm.name}!`, likes: 0, likedBy: [] as string[], comments: [], shares: 0, savedBy: [] as string[], reports: 0, createdAt: new Date().toISOString(),
      eventData: {
        id: generateId(), name: eventForm.name, description: eventForm.description, date: eventForm.date, time: eventForm.time, location: eventForm.location,
        maxParticipants: eventForm.maxParticipants, currentParticipants: 1, neededCount: eventForm.neededCount || undefined,
        category: eventForm.category as any, isCreatorAnonymous: eventForm.isAnonymous, joinType: eventForm.joinType,
        participants: [currentUser.id], pendingRequests: [] as string[], status: 'upcoming' as const,
      },
    };
    addPost(newPost);
    setShowCreate(false);
    setEventForm({ name: '', description: '', date: '', time: '', location: '', maxParticipants: 10, neededCount: 0, category: 'hangout', isAnonymous: false, joinType: 'direct' });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold gradient-text">Events & Plans</h1>
              <p className="text-sm text-gray-500 mt-1">Find or create campus events</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Create</button>
          </div>

          {/* Create modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">Create Event</h2>
                  <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" value={eventForm.name} onChange={(e) => setEventForm(p => ({ ...p, name: e.target.value }))} placeholder="Event name" className="input-field" />
                  <textarea value={eventForm.description} onChange={(e) => setEventForm(p => ({ ...p, description: e.target.value }))} placeholder="Tell people about your event..." rows={3} className="input-field resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={eventForm.date} onChange={(e) => setEventForm(p => ({ ...p, date: e.target.value }))} className="input-field" />
                    <input type="time" value={eventForm.time} onChange={(e) => setEventForm(p => ({ ...p, time: e.target.value }))} className="input-field" />
                  </div>
                  <input type="text" value={eventForm.location} onChange={(e) => setEventForm(p => ({ ...p, location: e.target.value }))} placeholder="Location" className="input-field" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600 mb-1 block">Max people</label><input type="number" value={eventForm.maxParticipants} onChange={(e) => setEventForm(p => ({ ...p, maxParticipants: parseInt(e.target.value) || 10 }))} min={2} className="input-field" /></div>
                    <div><label className="text-xs font-medium text-gray-600 mb-1 block">People needed</label><input type="number" value={eventForm.neededCount} onChange={(e) => setEventForm(p => ({ ...p, neededCount: parseInt(e.target.value) || 0 }))} min={0} className="input-field" /></div>
                  </div>
                  <select value={eventForm.category} onChange={(e) => setEventForm(p => ({ ...p, category: e.target.value }))} className="input-field">
                    <option value="party">Party</option><option value="clubbing">Clubbing</option><option value="movies">Movies</option>
                    <option value="sports">Sports</option><option value="gaming">Gaming</option><option value="study">Study Session</option>
                    <option value="hangout">Hangout</option><option value="roadtrip">Road Trip</option><option value="campus">Campus Activity</option><option value="other">Other</option>
                  </select>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={eventForm.isAnonymous} onChange={(e) => setEventForm(p => ({ ...p, isAnonymous: e.target.checked }))} className="w-4 h-4 rounded" /> Anonymous creator
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={eventForm.joinType === 'approval'} onChange={(e) => setEventForm(p => ({ ...p, joinType: e.target.checked ? 'approval' : 'direct' }))} className="w-4 h-4 rounded" /> Require approval
                    </label>
                  </div>
                  <button onClick={handleCreateEvent} disabled={!eventForm.name || !eventForm.date || !eventForm.time || !eventForm.location} className="btn-primary w-full disabled:opacity-50">Create Event</button>
                </div>
              </div>
            </div>
          )}

          {/* Events list */}
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="card p-8 text-center">
                <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No events yet</p>
                <p className="text-sm text-gray-400 mt-1">Create the first event and get people together!</p>
                <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4">Create Event</button>
              </div>
            ) : events.map(({ post, event }) => {
              const isParticipant = event.participants.includes(currentUser.id);
              const isPending = event.pendingRequests.includes(currentUser.id);
              const isFull = event.currentParticipants >= event.maxParticipants;

              return (
                <div key={post.id} className="card overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge-pill ${getCategoryColor(event.category)}`}>{event.category}</span>
                      <span className={`badge-pill ${event.status === 'upcoming' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{event.status}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{event.name}</h3>
                    {event.description && <p className="text-sm text-gray-600 mb-3">{event.description}</p>}
                    <div className="space-y-1.5 text-sm text-gray-500">
                      <p className="flex items-center gap-2"><Calendar size={14} /> {formatDate(event.date)} at {formatTime(event.time)}</p>
                      <p className="flex items-center gap-2"><MapPin size={14} /> {event.location}</p>
                      <p className="flex items-center gap-2"><Users size={14} /> {event.currentParticipants}/{event.maxParticipants} going{event.neededCount ? ` · Looking for ${event.neededCount} more` : ''}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div className="flex -space-x-2">
                        {event.participants.slice(0, 4).map((pId) => {
                          const u = getUserById(pId);
                          if (!u) return null;
                          return u.avatar
                            ? <img key={pId} src={u.avatar} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                            : <div key={pId} className="w-7 h-7 rounded-full border-2 border-white bg-campus-primary/10 flex items-center justify-center text-[10px] font-bold text-campus-primary">{(u.name || '?')[0]}</div>;
                        })}
                        {event.participants.length > 4 && <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">+{event.participants.length - 4}</div>}
                      </div>
                      {isParticipant ? (
                        <button onClick={() => leaveEvent(post.id)} className="btn-secondary text-sm flex items-center gap-1"><LogOut size={14} /> Leave</button>
                      ) : isPending ? (
                        <span className="badge-pill bg-yellow-100 text-yellow-700 text-xs">Pending approval</span>
                      ) : isFull ? (
                        <span className="badge-pill bg-gray-100 text-gray-600 text-xs">Full</span>
                      ) : (
                        <button onClick={() => joinEvent(post.id)} className="btn-primary text-sm flex items-center gap-1">
                          <Check size={14} /> {event.joinType === 'approval' ? 'Request to Join' : 'Join Event'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
