'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import PostCard from '@/components/posts/PostCard';
import ConnectActions from '@/components/connections/ConnectActions';
import { useApp } from '@/context/AppContext';
import { BookOpen, MapPin, Calendar, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { currentUser, users, posts, connections, getConnectionStatus } = useApp();

  const user = users.find(u => u.id === userId);
  const status = getConnectionStatus(userId);
  const userPosts = posts.filter(p => p.authorId === userId && !p.isAnonymous);
  const friendCount = connections[userId]?.length || 0;

  if (!user) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen pb-20 lg:pb-0"><TopBar /><div className="flex items-center justify-center h-96"><p className="text-gray-500">User not found</p></div></main>
        <BottomNav />
      </div>
    );
  }

  if (userId === currentUser.id) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen pb-20 lg:pb-0"><TopBar /><div className="flex items-center justify-center h-96"><Link href="/profile" className="btn-primary">Go to your profile</Link></div></main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto">
          {/* Cover */}
          <div className="relative h-48 md:h-56 bg-gradient-to-r from-campus-primary to-campus-accent">
            {user.coverImage && <img src={user.coverImage} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div className="px-4 -mt-16 relative pb-6">
            <div className="flex items-end gap-4 flex-wrap">
              <img src={user.avatar} alt={user.name} className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg" />
              <div className="flex-1 pb-2 min-w-0">
                <h1 className="text-xl font-bold">{user.name}</h1>
                <p className="text-sm text-gray-500">@{user.username}</p>
              </div>
            </div>

            {/* Connection actions - shows BOTH buttons directly when not connected */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <ConnectActions userId={userId} status={status} />
            </div>

            {/* Messaging note */}
            {(status === 'none' || status === 'friend-pending-sent' || status === 'relationship-pending-sent') && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 flex items-center gap-2">
                <MessageCircle size={14} />
                You need to be connected to send a message
              </div>
            )}

            <p className="text-sm text-gray-700 mt-4">{user.bio}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><BookOpen size={14} /> {user.course}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {user.faculty}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> Year {user.yearOfStudy}</span>
            </div>

            <div className="flex gap-6 mt-4 py-4 border-y border-gray-100">
              <div className="text-center"><p className="font-bold text-lg">{friendCount}</p><p className="text-xs text-gray-500">Connections</p></div>
              <div className="text-center"><p className="font-bold text-lg">{user.postsCount}</p><p className="text-xs text-gray-500">Posts</p></div>
              <div className="text-center"><p className="font-bold text-lg">{user.badges.length}</p><p className="text-xs text-gray-500">Badges</p></div>
            </div>

            {/* Interests */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">{user.interests.map(i => <span key={i} className="badge-pill bg-campus-primary/10 text-campus-primary">{i}</span>)}</div>
            </div>

            {/* Badges */}
            {user.badges.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">{user.badges.map(b => <span key={b.id} className="badge-pill bg-yellow-50 text-yellow-700">{b.emoji} {b.name}</span>)}</div>
              </div>
            )}

            {/* Posts */}
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-gray-700">Posts</h3>
              {userPosts.length > 0 ? userPosts.map(p => <PostCard key={p.id} post={p} />) : (
                <div className="card p-8 text-center text-gray-400"><p className="text-sm">No public posts yet</p></div>
              )}
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
