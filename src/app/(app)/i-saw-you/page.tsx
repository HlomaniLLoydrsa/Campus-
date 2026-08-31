'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import PostCard from '@/components/posts/PostCard';
import { useApp } from '@/context/AppContext';
import { Eye, MapPin, Plus, X, Lock, Hand } from 'lucide-react';
import { generateId } from '@/lib/utils';

export default function ISawYouPage() {
  const { posts, addPost, currentUser, respondToISawYou } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const iSawYouPosts = posts.filter(p => p.type === 'i-saw-you').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCreate = () => {
    if (!content.trim()) return;
    addPost({
      id: generateId(), type: 'i-saw-you', authorId: isAnonymous ? null : currentUser.id, isAnonymous,
      content: content.trim(), likes: 0, likedBy: [], comments: [], shares: 0, savedBy: [], reports: 0, createdAt: new Date().toISOString(),
      iSawYouData: { location: location || 'Campus', description: content.trim(), respondents: [] },
    });
    setShowCreate(false);
    setContent('');
    setLocation('');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><Eye className="text-campus-pink" /> I Saw You</h1>
              <p className="text-sm text-gray-500 mt-1">Missed connections on campus</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-accent flex items-center gap-2 text-sm"><Plus size={16} /> New Post</button>
          </div>

          {/* Hero */}
          <div className="card p-5 mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center flex-shrink-0"><Eye size={24} className="text-white" /></div>
              <div>
                <h3 className="font-bold text-sm">Missed a connection?</h3>
                <p className="text-xs text-gray-600 mt-0.5">Describe someone you noticed. Maybe they&apos;ll find your post!</p>
              </div>
            </div>
          </div>

          {/* Create */}
          {showCreate && (
            <div className="card p-5 mb-6 animate-slide-down">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold">I Saw You...</h3><button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button></div>
              <div className="space-y-4">
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="I saw someone wearing a blue jacket at the library today..." rows={4} className="input-field resize-none" />
                <div className="relative"><MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where? (Library, Cafeteria...)" className="input-field pl-9" /></div>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded" /><Lock size={14} className="text-gray-500" /> Post anonymously</label>
                <button onClick={handleCreate} disabled={!content.trim()} className="btn-accent w-full disabled:opacity-50">Post</button>
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {iSawYouPosts.length > 0 ? iSawYouPosts.map(post => (
              <div key={post.id}>
                <div className="relative">
                  {post.iSawYouData?.location && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="badge-pill bg-pink-100 text-pink-700 text-[10px]">📍 {post.iSawYouData.location}</span>
                    </div>
                  )}
                  <PostCard post={post} />
                </div>
                {/* That's me! button */}
                <div className="px-4 py-2 bg-gray-50 rounded-b-2xl border border-t-0 border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {post.iSawYouData && post.iSawYouData.respondents.length > 0
                      ? `${post.iSawYouData.respondents.length} person(s) responded`
                      : 'Think this is about you?'}
                  </div>
                  {post.iSawYouData && !post.iSawYouData.respondents.includes(currentUser.id) ? (
                    <button onClick={() => respondToISawYou(post.id)} className="flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg text-xs font-medium hover:bg-pink-200 transition-colors">
                      <Hand size={12} /> That&apos;s me!
                    </button>
                  ) : post.iSawYouData?.respondents.includes(currentUser.id) ? (
                    <span className="text-xs text-green-600 font-medium">You responded</span>
                  ) : null}
                </div>
              </div>
            )) : (
              <div className="card p-8 text-center">
                <Eye size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No posts yet</p>
                <p className="text-sm text-gray-400 mt-1">Be the first to post about a missed connection!</p>
                <button onClick={() => setShowCreate(true)} className="btn-accent text-sm mt-4">Create Post</button>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
