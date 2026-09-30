'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { Send, ArrowLeft, Users, UsersRound, Search, MessageCircle, Lock, X, Settings, Compass, Globe, Smile, Reply } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import CreateGroupModal from '@/components/messages/CreateGroupModal';
import ManageGroupModal from '@/components/messages/ManageGroupModal';

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { currentUser, conversations, sendMessage, reactToMessage, getUserById, isConnected, markConversationRead, createGroup, groupAction, connections } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderId: string; content: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageGroup, setShowManageGroup] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConv);

  // The other person in a direct chat (used to open their profile / photo)
  const otherUserId = selectedConversation && selectedConversation.type === 'direct'
    ? selectedConversation.participants.find(p => p !== currentUser.id) || null
    : null;

  // Open a conversation when arriving from a message notification
  useEffect(() => {
    const convId = searchParams.get('conversation');
    if (convId) setSelectedConv(convId);
  }, [searchParams]);

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
    if (conv.type === 'group' || conv.type === 'event') return conv.image || null;
    const otherParticipant = conv.participants.find(p => p !== currentUser.id);
    return otherParticipant ? getUserById(otherParticipant)?.avatar || null : null;
  };

  const isGroupAdmin = (conv: typeof conversations[0]) => !!conv.adminIds?.includes(currentUser.id);

  const canSendInConversation = (conv: typeof conversations[0]): boolean => {
    if (conv.type !== 'direct') return true; // group/event chats always allowed
    const otherParticipant = conv.participants.find(p => p !== currentUser.id);
    return otherParticipant ? isConnected(otherParticipant) : false;
  };

  const handleSend = () => {
    if (messageText.trim() && selectedConv) {
      sendMessage(selectedConv, messageText.trim(), replyingTo?.id || null);
      setMessageText('');
      setReplyingTo(null);
    }
  };

  // Clear any in-progress reply when switching conversations.
  useEffect(() => { setReplyingTo(null); }, [selectedConv]);

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
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowDiscover(true)} aria-label="Discover groups" title="Discover groups" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Compass size={20} /></button>
                  <button onClick={() => setShowCreateGroup(true)} aria-label="Create group" title="Create Group" className="flex items-center gap-1 px-3 py-2 rounded-lg bg-campus-primary/10 text-campus-primary text-sm font-medium hover:bg-campus-primary/15">
                    <UsersRound size={18} /> Group
                  </button>
                </div>
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
                    <img
                      src={getConversationAvatar(selectedConversation)!}
                      alt=""
                      onClick={() => { const a = getConversationAvatar(selectedConversation); if (a) setPhotoLightbox(a); }}
                      className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center"><Users size={18} className="text-white" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    {otherUserId ? (
                      <button onClick={() => router.push(`/profile/${otherUserId}`)} className="font-semibold text-sm hover:text-campus-primary text-left">
                        {getConversationName(selectedConversation)}
                      </button>
                    ) : selectedConversation.type === 'group' ? (
                      <button onClick={() => setShowManageGroup(true)} className="font-semibold text-sm hover:text-campus-primary text-left flex items-center gap-1">
                        {getConversationName(selectedConversation)}
                        {isGroupAdmin(selectedConversation) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-campus-primary/10 text-campus-primary">ADMIN</span>}
                      </button>
                    ) : (
                      <p className="font-semibold text-sm">{getConversationName(selectedConversation)}</p>
                    )}
                    {selectedConversation.type === 'direct' ? (
                      otherUserId && getUserById(otherUserId)?.isOnline ? (
                        <p className="text-xs text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online</p>
                      ) : (
                        <p className="text-xs text-gray-400">Tap name to view profile</p>
                      )
                    ) : (
                      <button onClick={() => selectedConversation.type === 'group' && setShowManageGroup(true)} className="text-xs text-gray-500 text-left">{selectedConversation.participants.length} members</button>
                    )}
                  </div>
                  {selectedConversation.type === 'group' && (
                    <button onClick={() => setShowManageGroup(true)} aria-label="Group settings" title="Group settings" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"><Settings size={18} /></button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedConversation.messages.length === 0 && (
                    <div className="text-center py-8 text-gray-400"><MessageCircle size={24} className="mx-auto mb-2 opacity-50" /><p className="text-xs">No messages yet. Say hello!</p></div>
                  )}
                  {selectedConversation.messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.senderId === currentUser.id}
                      isGroup={selectedConversation.type !== 'direct'}
                      currentUserId={currentUser.id}
                      sender={getUserById(msg.senderId)}
                      getUserById={getUserById}
                      onOpenProfile={(uid) => router.push(`/profile/${uid}`)}
                      onOpenPost={(pid) => router.push(`/?post=${pid}`)}
                      onOpenGame={(gid) => router.push(`/games?open=${gid}`)}
                      onReact={(emoji) => reactToMessage(selectedConversation.id, msg.id, emoji)}
                      onReply={() => setReplyingTo({ id: msg.id, senderId: msg.senderId, content: msg.content })}
                      onJumpTo={(mid) => { const el = document.getElementById(`msg-${mid}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-campus-primary'); setTimeout(() => el.classList.remove('ring-2', 'ring-campus-primary'), 1500); } }}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input - with connection check */}
                {canSendInConversation(selectedConversation) ? (
                  <div className="p-4 border-t border-gray-100">
                    {/* Reply preview banner */}
                    {replyingTo && (
                      <div className="flex items-center gap-2 mb-2 p-2 pl-3 bg-gray-50 border-l-2 border-campus-primary rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-campus-primary">Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : (getUserById(replyingTo.senderId)?.name || 'someone')}</p>
                          <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="p-1 rounded-lg hover:bg-gray-200 flex-shrink-0"><X size={15} className="text-gray-500" /></button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={replyingTo ? 'Type your reply…' : 'Type a message...'} className="input-field" />
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

        {showCreateGroup && (
          <CreateGroupModal
            friends={myFriends}
            onClose={() => setShowCreateGroup(false)}
            onCreate={async (opts) => {
              const id = await createGroup(opts);
              setShowCreateGroup(false);
              if (id) setSelectedConv(id);
            }}
          />
        )}

        {showManageGroup && selectedConv && (
          <ManageGroupModal
            groupId={selectedConv}
            onClose={() => setShowManageGroup(false)}
            onLeftOrDeleted={() => { setShowManageGroup(false); setSelectedConv(null); }}
          />
        )}

        {showDiscover && (
          <DiscoverGroupsModal
            onClose={() => setShowDiscover(false)}
            onJoined={(id) => { setShowDiscover(false); setSelectedConv(id); }}
          />
        )}

        {/* Profile photo lightbox */}
        {photoLightbox && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPhotoLightbox(null)}>
            <button onClick={() => setPhotoLightbox(null)} className="absolute top-4 right-4 text-white p-2"><X size={26} /></button>
            <img src={photoLightbox} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

// A single chat message bubble with reactions + reply (works for direct & group).
function MessageBubble({ msg, isOwn, isGroup, currentUserId, sender, getUserById, onOpenProfile, onOpenPost, onOpenGame, onReact, onReply, onJumpTo }: {
  msg: any;
  isOwn: boolean;
  isGroup: boolean;
  currentUserId: string;
  sender: any;
  getUserById: (id: string) => any;
  onOpenProfile: (uid: string) => void;
  onOpenPost: (pid: string) => void;
  onOpenGame: (gid: string) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onJumpTo: (mid: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const reactions: Record<string, string[]> = msg.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, ids]) => (ids as string[]).length > 0);

  const renderContent = () => {
    const sharedMatch = msg.content.match(/^\[shared-post:([^\]]+)\]\s*([\s\S]*)$/);
    if (sharedMatch) {
      const [, postId, label] = sharedMatch;
      return <button onClick={() => onOpenPost(postId)} className={`text-sm text-left underline decoration-dotted ${isOwn ? 'text-white' : 'text-campus-primary'}`}>{label || 'View shared post'}</button>;
    }
    const gameMatch = msg.content.match(/^\[game:([^\]]+)\]\s*([\s\S]*)$/);
    if (gameMatch) {
      const [, gameId, label] = gameMatch;
      return <button onClick={() => onOpenGame(gameId)} className={`text-sm text-left underline decoration-dotted font-medium ${isOwn ? 'text-white' : 'text-campus-primary'}`}>{label || 'Open game'}</button>;
    }
    return <p className="text-sm break-words">{msg.content}</p>;
  };

  return (
    <div id={`msg-${msg.id}`} className={`flex rounded-xl transition-all ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && (
          <button onClick={() => sender && onOpenProfile(sender.id)} title="View profile" className="flex-shrink-0">
            <Avatar src={sender?.avatar} name={sender?.name} size={28} />
          </button>
        )}
        <div className="relative">
          {/* Hover/tap actions: react + reply */}
          <div className={`absolute -top-3 ${isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} z-10`}>
            {showActions && (
              <div className="flex items-center gap-0.5 bg-white shadow-lg border border-gray-100 rounded-full px-1.5 py-1">
                {REACTION_EMOJIS.map(e => (
                  <button key={e} onClick={() => { onReact(e); setShowActions(false); }} className="text-base hover:scale-125 transition-transform leading-none">{e}</button>
                ))}
                <button onClick={() => { onReply(); setShowActions(false); }} aria-label="Reply" className="ml-0.5 p-1 rounded-full hover:bg-gray-100 text-gray-500"><Reply size={14} /></button>
              </div>
            )}
          </div>

          <div
            onClick={() => setShowActions(v => !v)}
            className={`px-4 py-2.5 rounded-2xl cursor-pointer ${isOwn ? 'bg-campus-primary text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}
          >
            {!isOwn && isGroup && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{sender?.name}</p>}

            {/* Quoted replied-to message */}
            {msg.replyTo && (
              <button
                onClick={(ev) => { ev.stopPropagation(); onJumpTo(msg.replyTo.id); }}
                className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded ${isOwn ? 'border-white/50 bg-white/10' : 'border-campus-primary/40 bg-black/5'} px-2 py-1`}
              >
                <p className={`text-[10px] font-semibold ${isOwn ? 'text-white/80' : 'text-campus-primary'}`}>{msg.replyTo.senderId === currentUserId ? 'You' : (getUserById(msg.replyTo.senderId)?.name || 'Someone')}</p>
                <p className={`text-[11px] truncate ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>{msg.replyTo.content}</p>
              </button>
            )}

            {renderContent()}
            <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
              <p className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>{formatTimeAgo(msg.timestamp)}</p>
            </div>
          </div>

          {/* Reaction chips */}
          {reactionEntries.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {reactionEntries.map(([emoji, ids]) => {
                const mine = (ids as string[]).includes(currentUserId);
                return (
                  <button key={emoji} onClick={() => onReact(emoji)} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${mine ? 'bg-campus-primary/10 border-campus-primary/30' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <span className="leading-none">{emoji}</span>
                    <span className={mine ? 'text-campus-primary font-medium' : 'text-gray-500'}>{(ids as string[]).length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* Quick react/reply trigger on the opposite side */}
        <button onClick={() => setShowActions(v => !v)} aria-label="Message actions" className="self-center p-1 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 flex-shrink-0"><Smile size={15} /></button>
      </div>
    </div>
  );
}

// Browse discoverable groups and join one.
function DiscoverGroupsModal({ onClose, onJoined }: { onClose: () => void; onJoined: (id: string) => void }) {
  const { groupAction } = useApp();
  const [groups, setGroups] = useState<{ id: string; name: string; description: string; image: string; memberCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/groups/discover', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setGroups(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const join = async (id: string) => {
    setJoining(id);
    const ok = await groupAction(id, { action: 'join' });
    setJoining(null);
    if (ok) onJoined(id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Compass size={18} /> Discover Groups</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-400"><Globe size={28} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No discoverable groups yet</p></div>
        ) : (
          <div className="space-y-2">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-100">
                {g.image ? <img src={g.image} alt="" className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center"><Users size={18} className="text-white" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-[11px] text-gray-400">{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => join(g.id)} disabled={joining === g.id} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{joining === g.id ? 'Joining…' : 'Join'}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
