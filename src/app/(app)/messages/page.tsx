'use client';

import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { Send, ArrowLeft, Users, Search, MessageCircle, Lock, Plus, X, Check } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import Avatar from '@/components/Avatar';

export default function MessagesPage() {
  const { currentUser, conversations, sendMessage, getUserById, isConnected, markConversationRead, createConversation, connections, users } = useApp();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConv);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages.length]);

  // Mark conversation read when opened
  useEffect(() => {
    if (selectedConv && selectedConversation && selectedConversation.unreadCount > 0) {
      markConversationRead(selectedConv);
    }
  }, [selectedConv]);

  const myFriends = (connections[currentUser.id] || []).map(id => getUserById(id)).filter(Boolean) as NonNullable<ReturnType<typeof getUserById>>[];

  const getConversationName = (conv: typeof conversations[0]) => {
    if (conv.name) return conv.name;
    const otherParticipant = conv.participants.find(p => p !== currentUser.id);
    return otherParticipant ? getUserById(otherParticipant)?.name || 'Unknown' : 'Unknown';
  };

  const getConversationAvatar = (conv: typeof conversations[0]) => {
    if (conv.type === 'group' || conv.type === 'event') return null;
    const otherParticipant = conv.participants.find(p => p !== currentUser.id);
    return otherParticipant ? getUserById(otherParticipant)?.avatar || null : null;
  };

  const canSendInConversation = (conv: typeof conversations[0]): boolean => {
    if (conv.type !== 'direct') return true; // group/event chats always allowed
    const otherParticipant = conv.participants.find(p => p !== currentUser.id);
    return otherParticipant ? isConnected(otherParticipant) : false;
  };

  const handleSend = () => {
    if (messageText.trim() && selectedConv) {
      sendMessage(selectedConv, messageText.trim());
      setMessageText('');
    }
  };

  const filteredConversations = conversations.filter(c => {
    const name = getConversationName(c);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-4xl mx-auto h-[calc(100vh-64px)] lg:h-[calc(100vh-73px)] flex">
          {/* Conversation list */}
          <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">Messages</h2>
                <button onClick={() => setShowNewGroup(true)} className="p-2 rounded-lg hover:bg-gray-100 text-campus-primary" title="New group chat"><Plus size={20} /></button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-campus-primary/20" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Connect with someone to start chatting</p>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const avatar = getConversationAvatar(conv);
                  const name = getConversationName(conv);
                  const lastMsg = conv.lastMessage;
                  const senderName = lastMsg ? (lastMsg.senderId === currentUser.id ? 'You' : getUserById(lastMsg.senderId)?.name?.split(' ')[0]) : '';
                  return (
                    <button key={conv.id} onClick={() => setSelectedConv(conv.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedConv === conv.id ? 'bg-campus-primary/5' : ''}`}>
                      {avatar ? (
                        <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center flex-shrink-0">
                          <Users size={20} className="text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{name}</p>
                          {lastMsg && <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(lastMsg.timestamp)}</span>}
                        </div>
                        {lastMsg && <p className="text-xs text-gray-500 truncate mt-0.5">{conv.type !== 'direct' && `${senderName}: `}{lastMsg.content}</p>}
                      </div>
                      {conv.unreadCount > 0 && <span className="w-5 h-5 bg-campus-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{conv.unreadCount}</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                  <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></button>
                  {getConversationAvatar(selectedConversation) ? (
                    <img src={getConversationAvatar(selectedConversation)!} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center"><Users size={18} className="text-white" /></div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{getConversationName(selectedConversation)}</p>
                    <p className="text-xs text-gray-500">{selectedConversation.type === 'direct' ? '' : `${selectedConversation.participants.length} members`}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedConversation.messages.length === 0 && (
                    <div className="text-center py-8 text-gray-400"><MessageCircle size={24} className="mx-auto mb-2 opacity-50" /><p className="text-xs">No messages yet. Say hello!</p></div>
                  )}
                  {selectedConversation.messages.map(msg => {
                    const isOwn = msg.senderId === currentUser.id;
                    const sender = getUserById(msg.senderId);
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {!isOwn && <Avatar src={sender?.avatar} name={sender?.name} size={28} />}
                          <div className={`px-4 py-2.5 rounded-2xl ${isOwn ? 'bg-campus-primary text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                            {!isOwn && selectedConversation.type !== 'direct' && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{sender?.name}</p>}
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>{formatTimeAgo(msg.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input - with connection check */}
                {canSendInConversation(selectedConversation) ? (
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="input-field" />
                      <button onClick={handleSend} disabled={!messageText.trim()} className="btn-primary p-3 disabled:opacity-50"><Send size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-700">
                      <Lock size={16} className="flex-shrink-0" />
                      <p>You must be connected to send messages. Send a connection request first.</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Select a conversation</p>
                  <p className="text-sm text-gray-400 mt-1">Choose a chat or connect with someone to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showNewGroup && (
          <NewGroupModal
            friends={myFriends}
            onClose={() => setShowNewGroup(false)}
            onCreate={(name, ids) => { const id = createConversation(ids, name, 'group'); setShowNewGroup(false); setSelectedConv(id); }}
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function NewGroupModal({ friends, onClose, onCreate }: { friends: any[]; onClose: () => void; onCreate: (name: string, ids: string[]) => void }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = () => {
    if (!name.trim()) { setError('Give your group a name'); return; }
    if (selected.length === 0) { setError('Add at least one friend'); return; }
    onCreate(name.trim(), selected);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">New Group Chat</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g. Study Squad)" className="input-field mb-4" />
        <p className="text-xs font-medium text-gray-600 mb-2">Add friends ({selected.length} selected)</p>
        {friends.length > 0 ? (
          <div className="space-y-1 max-h-52 overflow-y-auto mb-4">
            {friends.map(f => (
              <button key={f.id} onClick={() => toggle(f.id)} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${selected.includes(f.id) ? 'bg-campus-primary/10' : 'hover:bg-gray-50'}`}>
                <Avatar src={f.avatar} name={f.name} size={36} />
                <span className="flex-1 text-left text-sm font-medium">{f.name}</span>
                {selected.includes(f.id) && <Check size={16} className="text-campus-primary" />}
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400 mb-4">You need friends to create a group. Connect with people first!</p>}
        <button onClick={handleCreate} disabled={friends.length === 0} className="btn-primary w-full disabled:opacity-50">Create Group</button>
      </div>
    </div>
  );
}
