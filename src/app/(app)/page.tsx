'use client';

import React, { useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';
import ConnectActions from '@/components/connections/ConnectActions';
import Avatar from '@/components/Avatar';
import { useApp } from '@/context/AppContext';
import { Plus, X, ImageIcon, ChevronLeft, ChevronRight, TrendingUp, Gamepad2, Calendar, Compass } from 'lucide-react';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/utils';
import { Story } from '@/types';

const STORY_COLORS = ['#00002A', '#1A3F75', '#4E6A9C', '#A9C4DE', '#2E8B77', '#5A7BA8', '#3B5480'];

export default function HomePage() {
  const { posts, currentUser, getUserById, stories, createStory, users, connections, games, getConnectionStatus } = useApp();
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [viewingStoryUser, setViewingStoryUser] = useState<string | null>(null);

  // Group stories by user
  const storiesByUser = stories.reduce((acc, story) => {
    if (!acc[story.userId]) acc[story.userId] = [];
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const myStories = storiesByUser[currentUser.id] || [];
  const otherUserIds = Object.keys(storiesByUser).filter(id => id !== currentUser.id);

  // Recommendations: people not yet connected (friends OR relationship), prioritize shared interests/course
  const myInterests = new Set(currentUser.interests || []);
  const connectedIds = new Set(connections[currentUser.id] || []);
  const recommendations = users
    .filter(u => u.id !== currentUser.id && !connectedIds.has(u.id) && getConnectionStatus(u.id) === 'none')
    .map(u => {
      const shared = (u.interests || []).filter(i => myInterests.has(i)).length + (u.course === currentUser.course ? 2 : 0);
      return { user: u, score: shared };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const activeGamesCount = games.filter(g => g.status === 'active').length;
  const eventsCount = posts.filter(p => p.eventData).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Stories Row */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {/* My story */}
            <button onClick={() => myStories.length > 0 ? setViewingStoryUser(currentUser.id) : setShowStoryCreate(true)} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className={`relative w-16 h-16 rounded-full p-[2px] ${myStories.length > 0 ? 'bg-gradient-to-br from-campus-primary to-campus-accent' : 'bg-gray-200'}`}>
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Your story" className="w-full h-full rounded-full object-cover border-2 border-white" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-100 border-2 border-white flex items-center justify-center"><span className="text-gray-400 font-bold text-lg">{(currentUser.name || '?')[0]}</span></div>
                )}
                <button onClick={(e) => { e.stopPropagation(); setShowStoryCreate(true); }} className="absolute bottom-0 right-0 w-5 h-5 bg-campus-primary text-white rounded-full flex items-center justify-center border-2 border-white">
                  <Plus size={10} strokeWidth={3} />
                </button>
              </div>
              <span className="text-[10px] font-medium text-gray-600">Your story</span>
            </button>

            {/* Other users' stories */}
            {otherUserIds.map(uid => {
              const user = getUserById(uid);
              if (!user) return null;
              return (
                <button key={uid} onClick={() => setViewingStoryUser(uid)} className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-campus-accent to-campus-primary p-[2px]">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover border-2 border-white" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-100 border-2 border-white flex items-center justify-center"><span className="text-gray-400 font-bold">{(user.name || '?')[0]}</span></div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 truncate w-16 text-center">{user.name.split(' ')[0]}</span>
                </button>
              );
            })}

            {otherUserIds.length === 0 && myStories.length === 0 && (
              <div className="flex items-center text-xs text-gray-400 pl-2">Be the first to share a story</div>
            )}
          </div>

          {/* Story create modal */}
          {showStoryCreate && <StoryCreateModal onClose={() => setShowStoryCreate(false)} onCreate={createStory} />}

          {/* Story viewer */}
          {viewingStoryUser && (
            <StoryViewer
              stories={storiesByUser[viewingStoryUser] || []}
              user={getUserById(viewingStoryUser)}
              onClose={() => setViewingStoryUser(null)}
            />
          )}

          {/* Quick links strip */}
          <div className="grid grid-cols-4 gap-2">
            <Link href="/explore" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors"><TrendingUp size={18} className="text-orange-500" /><span className="text-[10px] font-medium text-gray-600">Trending</span></Link>
            <Link href="/events" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors"><Calendar size={18} className="text-green-500" /><span className="text-[10px] font-medium text-gray-600">Events {eventsCount > 0 ? `(${eventsCount})` : ''}</span></Link>
            <Link href="/games" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors"><Gamepad2 size={18} className="text-indigo-500" /><span className="text-[10px] font-medium text-gray-600">Games {activeGamesCount > 0 ? `(${activeGamesCount})` : ''}</span></Link>
            <Link href="/explore" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors"><Compass size={18} className="text-campus-primary" /><span className="text-[10px] font-medium text-gray-600">Explore</span></Link>
          </div>

          {/* Create post */}
          <CreatePost />

          {/* Recommended connections */}
          {recommendations.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">People you may know</h3>
                <Link href="/connections" className="text-xs text-campus-primary font-medium">See all</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {recommendations.map(({ user }) => (
                  <div key={user.id} className="flex-shrink-0 w-32 border border-gray-100 rounded-2xl p-3 text-center">
                    <Link href={`/profile/${user.id}`} className="block">
                      <div className="flex justify-center"><Avatar src={user.avatar} name={user.name} size={56} /></div>
                      <p className="text-xs font-semibold mt-2 truncate">{user.name.split(' ')[0]}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.course || 'Student'}</p>
                    </Link>
                    <div className="mt-2 flex justify-center">
                      <ConnectActions userId={user.id} status={getConnectionStatus(user.id)} compact />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feed */}
          <div className="space-y-4">
            {posts.length > 0 ? (
              posts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="card p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-campus-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={26} className="text-campus-primary" />
                </div>
                <p className="font-semibold text-gray-700">No posts yet</p>
                <p className="text-sm text-gray-400 mt-1">Be the first to share something with campus!</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function StoryCreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (content: string, image: string | undefined, bg: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(STORY_COLORS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!content.trim() && !imageFile) return;
    setPosting(true);
    let imageUrl: string | undefined;
    if (imageFile) {
      const fd = new FormData();
      fd.append('file', imageFile);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) imageUrl = (await res.json()).url;
      } catch {}
    }
    await onCreate(content.trim(), imageUrl, bgColor);
    setPosting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Create Story</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>

        {/* Preview */}
        <div className="rounded-xl overflow-hidden mb-4 aspect-[9/16] flex items-center justify-center relative" style={{ backgroundColor: imagePreview ? '#000' : bgColor }}>
          {imagePreview && <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-contain" />}
          <p className="relative text-white font-semibold text-center px-4 text-lg break-words drop-shadow">{content || 'Your story preview'}</p>
        </div>

        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind? (disappears in 24h)" rows={2} className="input-field resize-none mb-3" />

        {/* Color picker */}
        {!imagePreview && (
          <div className="flex gap-2 mb-3">
            {STORY_COLORS.map(color => (
              <button key={color} onClick={() => setBgColor(color)} className={`w-7 h-7 rounded-full border-2 transition-transform ${bgColor === color ? 'border-gray-800 scale-110' : 'border-white'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}

        <input type="file" ref={fileRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="btn-secondary w-full text-sm mb-3 flex items-center justify-center gap-2">
          <ImageIcon size={16} /> {imagePreview ? 'Change Photo' : 'Add Photo'}
        </button>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleShare} disabled={(!content.trim() && !imageFile) || posting} className="btn-primary flex-1 disabled:opacity-50">{posting ? 'Sharing...' : 'Share Story'}</button>
        </div>
      </div>
    </div>
  );
}

function StoryViewer({ stories, user, onClose }: { stories: Story[]; user: any; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  if (stories.length === 0 || !user) return null;
  const story = stories[index];

  const next = () => { if (index < stories.length - 1) setIndex(index + 1); else onClose(); };
  const prev = () => { if (index > 0) setIndex(index - 1); };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
            <div className={`h-full bg-white ${i <= index ? 'w-full' : 'w-0'}`} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {user.avatar ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/50" /> : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{(user.name || '?')[0]}</div>}
          <div>
            <p className="text-white text-sm font-medium">{user.name}</p>
            <p className="text-white/60 text-[10px]">{formatTimeAgo(story.createdAt)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white p-1"><X size={24} /></button>
      </div>

      {/* Story content */}
      <div className="w-full max-w-md aspect-[9/16] flex items-center justify-center relative" style={{ backgroundColor: story.image ? '#000' : story.backgroundColor }}>
        {story.image && <img src={story.image} alt="" className="absolute inset-0 w-full h-full object-contain" />}
        {story.content && <p className="relative text-white font-semibold text-center px-6 text-xl break-words">{story.content}</p>}
      </div>

      {/* Nav */}
      <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3" />
      <button onClick={next} className="absolute right-0 top-0 bottom-0 w-1/3" />
      {index > 0 && <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 bg-black/30 rounded-full p-1"><ChevronLeft size={20} /></button>}
      {index < stories.length - 1 && <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 bg-black/30 rounded-full p-1"><ChevronRight size={20} /></button>}
    </div>
  );
}
