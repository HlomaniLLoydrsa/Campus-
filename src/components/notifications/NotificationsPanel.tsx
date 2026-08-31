'use client';

import React from 'react';
import { X, Check, CheckCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatTimeAgo } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

export default function NotificationsPanel({ onClose }: Props) {
  const { notifications, markNotificationRead, markAllNotificationsRead, getUserById } = useApp();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'friend-request': return '👋';
      case 'event-invitation': return '🎉';
      case 'secret-admirer': return '👀';
      case 'wingman-activity': return '🏹';
      case 'game-invitation': return '🎮';
      case 'shoutout': return '🎤';
      case 'mention': return '📢';
      default: return '🔔';
    }
  };

  return (
    <div className="absolute top-full right-0 w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-xl m-2 animate-slide-down overflow-hidden z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-bold text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-campus-primary font-medium hover:underline flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => {
            const fromUser = notification.fromUserId ? getUserById(notification.fromUserId) : null;
            return (
              <div
                key={notification.id}
                onClick={() => markNotificationRead(notification.id)}
                className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 ${
                  !notification.read ? 'bg-campus-primary/5' : ''
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-lg">
                  {fromUser ? (
                    <img src={fromUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(notification.createdAt)}</p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-campus-primary rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
