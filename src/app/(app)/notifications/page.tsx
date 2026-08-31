'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { Bell, CheckCheck } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, getUserById } = useApp();

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'like': '❤️', 'comment': '💬', 'reply': '↩️', 'friend-request': '🤝', 'relationship-request': '❤️',
      'friend-accepted': '✅', 'relationship-accepted': '💕', 'request-cancelled': '❌',
      'new-message': '✉️', 'group-message': '👥', 'event-invitation': '🎉', 'event-join-request': '📩',
      'event-approved': '🎫', 'event-message': '📢', 'secret-admirer': '👀', 'wingman-activity': '🏹',
      'game-invitation': '🎮', 'shoutout': '🎤', 'question-answer': '❓', 'mention': '📢', 'new-connection': '🤝',
    };
    return icons[type] || '🔔';
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold gradient-text">Notifications</h1><p className="text-sm text-gray-500 mt-1">{unread.length} unread</p></div>
            <button onClick={markAllNotificationsRead} className="btn-secondary text-sm flex items-center gap-1"><CheckCheck size={14} /> Mark all read</button>
          </div>

          <div className="space-y-2">
            {unread.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">New</p>
                {unread.map(n => {
                  const fromUser = n.fromUserId ? getUserById(n.fromUserId) : null;
                  return (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} className="card p-4 bg-campus-primary/5 border-campus-primary/10 cursor-pointer hover:bg-campus-primary/10 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm text-lg">
                          {fromUser ? <img src={fromUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{n.message}</p>
                          {n.requestType && (
                            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${n.requestType === 'friend' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                              {n.requestType === 'friend' ? '🤝 Friend Request' : '❤️ Relationship Request'}
                            </span>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                        <div className="w-2 h-2 bg-campus-primary rounded-full flex-shrink-0 mt-2" />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {read.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-6">Earlier</p>
                {read.map(n => {
                  const fromUser = n.fromUserId ? getUserById(n.fromUserId) : null;
                  return (
                    <div key={n.id} className="card p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-lg">
                          {fromUser ? <img src={fromUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600">{n.message}</p>
                          {n.requestType && (
                            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${n.requestType === 'friend' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                              {n.requestType === 'friend' ? '🤝 Friend' : '❤️ Relationship'}
                            </span>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {notifications.length === 0 && (
              <div className="card p-8 text-center"><Bell size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">All caught up!</p><p className="text-sm text-gray-400 mt-1">No notifications to show</p></div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
