'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import ConnectActions from '@/components/connections/ConnectActions';
import Avatar from '@/components/Avatar';
import { useApp } from '@/context/AppContext';
import { Search, Users } from 'lucide-react';
import Link from 'next/link';

export default function ConnectionsPage() {
  const { currentUser, users, connections, connectionRequests, getConnectionStatus } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'discover'>('discover');

  const incomingRequests = connectionRequests.filter(r => r.toUserId === currentUser.id && r.status === 'pending');
  const outgoingRequests = connectionRequests.filter(r => r.fromUserId === currentUser.id && r.status === 'pending');
  const discoverPeople = users.filter(u => u.id !== currentUser.id && !(connections[currentUser.id] || []).includes(u.id));
  const filteredDiscover = discoverPeople.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.course.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text">Connections</h1>
            <p className="text-sm text-gray-500 mt-1">Send requests and discover people on campus</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search people..." className="input-field pl-10" />
          </div>

          {/* Tabs - only Requests and Discover */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${activeTab === 'requests' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Requests
              {incomingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-campus-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">{incomingRequests.length}</span>}
            </button>
            <button onClick={() => setActiveTab('discover')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'discover' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Discover
            </button>
          </div>

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {incomingRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-3">Incoming Requests</h3>
                  <div className="space-y-3">
                    {incomingRequests.map(request => {
                      const fromUser = users.find(u => u.id === request.fromUserId);
                      if (!fromUser) return null;
                      const status = getConnectionStatus(fromUser.id);
                      return (
                        <div key={request.id} className="card p-4">
                          <div className="flex items-start gap-3">
                            <Link href={`/profile/${fromUser.id}`}>
                              <Avatar src={fromUser.avatar} name={fromUser.name} size={48} />
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link href={`/profile/${fromUser.id}`} className="font-semibold text-sm hover:text-campus-primary">{fromUser.name}</Link>
                              <p className="text-xs text-gray-500">{fromUser.course} · Year {fromUser.yearOfStudy}</p>
                              <div className="mt-2">
                                <ConnectActions userId={fromUser.id} status={status} compact />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {outgoingRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-3 mt-4">Sent Requests</h3>
                  <div className="space-y-3">
                    {outgoingRequests.map(request => {
                      const toUser = users.find(u => u.id === request.toUserId);
                      if (!toUser) return null;
                      const status = getConnectionStatus(toUser.id);
                      return (
                        <div key={request.id} className="card p-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={toUser.avatar} name={toUser.name} size={48} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{toUser.name}</p>
                              <p className="text-xs text-gray-500">{toUser.course}</p>
                            </div>
                            <ConnectActions userId={toUser.id} status={status} compact />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-4xl mb-3">📬</p>
                  <p className="text-gray-500 font-medium">No pending requests</p>
                  <p className="text-xs text-gray-400 mt-1">Discover people and send them a request</p>
                  <button onClick={() => setActiveTab('discover')} className="btn-primary text-sm mt-4">Discover People</button>
                </div>
              )}
            </div>
          )}

          {/* DISCOVER TAB - shows both Friend Request and Relationship Request buttons */}
          {activeTab === 'discover' && (
            <div className="space-y-3">
              {filteredDiscover.length === 0 ? (
                <div className="card p-8 text-center">
                  <Users size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">{searchQuery ? 'No people match your search' : 'No more people to discover'}</p>
                </div>
              ) : filteredDiscover.map(user => {
                const status = getConnectionStatus(user.id);
                return (
                  <div key={user.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/profile/${user.id}`}>
                        <Avatar src={user.avatar} name={user.name} size={48} online={user.isOnline} />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${user.id}`} className="font-semibold text-sm hover:text-campus-primary transition-colors">{user.name}</Link>
                        <p className="text-xs text-gray-500">{user.course} · Year {user.yearOfStudy}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.interests.slice(0, 3).map(interest => <span key={interest} className="badge-pill bg-gray-100 text-gray-600 text-[10px]">{interest}</span>)}
                        </div>
                        {/* Connection actions - shows BOTH buttons directly */}
                        <div className="mt-3">
                          <ConnectActions userId={user.id} status={status} compact />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
