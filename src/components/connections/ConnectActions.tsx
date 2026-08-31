'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Check, X, Clock, MessageCircle, UserMinus, Heart, Users } from 'lucide-react';
import { ConnectionStatus } from '@/types';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  status: ConnectionStatus;
  compact?: boolean;
}

export default function ConnectActions({ userId, status, compact = false }: Props) {
  const { sendRequest, cancelRequest, acceptRequest, rejectRequest, removeFriend, getRequestForUser, getOrCreateDirectConversation } = useApp();
  const request = getRequestForUser(userId);
  const router = useRouter();

  const handleMessage = () => {
    const convId = getOrCreateDirectConversation(userId);
    if (convId) router.push('/messages');
  };

  // NO CONNECTION — show both buttons directly
  if (status === 'none') {
    return (
      <div className={`flex ${compact ? 'flex-col gap-1.5' : 'flex-row gap-2'}`}>
        <button
          onClick={() => sendRequest(userId, 'friend')}
          className={`flex items-center gap-1.5 bg-campus-primary text-white rounded-xl font-medium transition-all hover:shadow-lg active:scale-95 cursor-pointer ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`}
        >
          <Users size={compact ? 12 : 14} />
          <span>Friend Request</span>
        </button>
        <button
          onClick={() => sendRequest(userId, 'relationship')}
          className={`flex items-center gap-1.5 bg-campus-accent text-white rounded-xl font-medium transition-all hover:shadow-lg active:scale-95 cursor-pointer ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`}
        >
          <Heart size={compact ? 12 : 14} />
          <span>Relationship Request</span>
        </button>
      </div>
    );
  }

  // FRIEND REQUEST SENT
  if (status === 'friend-pending-sent') {
    return (
      <div className="flex items-center gap-2">
        <span className={`badge-pill bg-blue-100 text-blue-700 ${compact ? 'text-[10px]' : 'text-xs'}`}>🤝 Friend Request Sent</span>
        <button onClick={() => request && cancelRequest(request.id)} className={`flex items-center gap-1 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:scale-95 cursor-pointer ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
          <X size={12} /> Cancel
        </button>
      </div>
    );
  }

  // RELATIONSHIP REQUEST SENT
  if (status === 'relationship-pending-sent') {
    return (
      <div className="flex items-center gap-2">
        <span className={`badge-pill bg-pink-100 text-pink-700 ${compact ? 'text-[10px]' : 'text-xs'}`}>❤️ Relationship Request Sent</span>
        <button onClick={() => request && cancelRequest(request.id)} className={`flex items-center gap-1 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:scale-95 cursor-pointer ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
          <X size={12} /> Cancel
        </button>
      </div>
    );
  }

  // INCOMING FRIEND REQUEST
  if (status === 'friend-pending-received') {
    return (
      <div className={`flex ${compact ? 'flex-col gap-1.5' : 'items-center gap-2 flex-wrap'}`}>
        <span className={`badge-pill bg-blue-100 text-blue-700 ${compact ? 'text-[10px]' : 'text-xs'}`}>🤝 Friend Request</span>
        <div className="flex gap-2">
          <button onClick={() => request && acceptRequest(request.id)} className={`flex items-center gap-1 bg-campus-primary text-white rounded-xl font-medium hover:shadow-lg active:scale-95 cursor-pointer ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}>
            <Check size={14} /> Accept
          </button>
          <button onClick={() => request && rejectRequest(request.id)} className={`flex items-center gap-1 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:scale-95 cursor-pointer ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}>
            <X size={14} /> Delete
          </button>
        </div>
      </div>
    );
  }

  // INCOMING RELATIONSHIP REQUEST
  if (status === 'relationship-pending-received') {
    return (
      <div className={`flex ${compact ? 'flex-col gap-1.5' : 'items-center gap-2 flex-wrap'}`}>
        <span className={`badge-pill bg-pink-100 text-pink-700 ${compact ? 'text-[10px]' : 'text-xs'}`}>❤️ Relationship Request</span>
        <div className="flex gap-2">
          <button onClick={() => request && acceptRequest(request.id)} className={`flex items-center gap-1 bg-campus-accent text-white rounded-xl font-medium hover:shadow-lg active:scale-95 cursor-pointer ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}>
            <Check size={14} /> Accept
          </button>
          <button onClick={() => request && rejectRequest(request.id)} className={`flex items-center gap-1 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:scale-95 cursor-pointer ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}>
            <X size={14} /> Decline
          </button>
        </div>
      </div>
    );
  }

  // ALREADY FRIENDS
  if (status === 'friends') {
    return (
      <div className="flex items-center gap-2">
        <button onClick={handleMessage} className={`flex items-center gap-1 bg-campus-primary text-white rounded-xl font-medium hover:shadow-lg active:scale-95 cursor-pointer ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}>
          <MessageCircle size={14} /> Message
        </button>
        <button onClick={() => removeFriend(userId)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Remove friend">
          <UserMinus size={16} />
        </button>
      </div>
    );
  }

  // IN A RELATIONSHIP
  if (status === 'relationship') {
    return (
      <div className="flex items-center gap-2">
        <span className="badge-pill bg-pink-100 text-pink-700 text-xs">❤️ Connected</span>
        <button onClick={handleMessage} className={`flex items-center gap-1 bg-campus-primary text-white rounded-xl font-medium hover:shadow-lg active:scale-95 cursor-pointer ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}>
          <MessageCircle size={14} /> Message
        </button>
      </div>
    );
  }

  return null;
}
