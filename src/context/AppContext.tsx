'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, Post, Conversation, Notification, Game, SecretAdmirer, WingmanSuggestion, ConnectionRequest, ConnectionStatus, RequestType, WouldYouRatherData, NeverHaveIEverData, TwoTruthsOneLieData, Story } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface AppContextType {
  currentUser: User;
  isAuthenticated: boolean;
  posts: Post[];
  addPost: (post: Post) => void;
  likePost: (postId: string) => void;
  savePost: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  connections: Record<string, string[]>;
  relationships: Record<string, string | null>;
  connectionRequests: ConnectionRequest[];
  sendRequest: (toUserId: string, type: RequestType) => void;
  cancelRequest: (requestId: string) => void;
  acceptRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
  removeFriend: (userId: string) => void;
  getConnectionStatus: (targetId: string) => ConnectionStatus;
  getRequestForUser: (targetId: string) => ConnectionRequest | undefined;
  isConnected: (targetId: string) => boolean;
  conversations: Conversation[];
  sendMessage: (conversationId: string, content: string) => void;
  createConversation: (participantIds: string[], name?: string, type?: 'direct' | 'group') => string;
  getOrCreateDirectConversation: (userId: string) => string | null;
  markConversationRead: (conversationId: string) => void;
  notifications: Notification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  games: Game[];
  createGame: (type: Game['type'], title: string, data: any) => Promise<string | null>;
  voteWouldYouRather: (gameId: string, option: 'A' | 'B') => void;
  voteNeverHaveIEver: (gameId: string, statementIndex: number, response: 'iHave' | 'iHaveNot') => void;
  guessTwoTruths: (gameId: string, guessIndex: number) => void;
  revealTwoTruths: (gameId: string) => void;
  secretAdmirers: SecretAdmirer[];
  sendSecretAdmirer: (toUserId: string, message: string) => void;
  respondToAdmirer: (id: string, action: 'curious' | 'reveal' | 'ignored' | 'blocked') => void;
  wingmanSuggestions: WingmanSuggestion[];
  sendWingmanSuggestion: (forUserId: string, suggestedUserId: string, reason: string) => void;
  respondToWingman: (id: string, action: 'accepted' | 'rejected') => void;
  respondToISawYou: (postId: string) => void;
  joinEvent: (postId: string) => void;
  leaveEvent: (postId: string) => void;
  stories: Story[];
  createStory: (content: string, image: string | undefined, backgroundColor: string) => Promise<void>;
  sharePost: (postId: string) => void;
  reportContent: (targetType: string, targetId: string, reason: string) => void;
  deletePost: (postId: string) => void;
  blockUser: (userId: string) => void;
  badges: { id: string; name: string; emoji: string; description: string; earned: boolean; earnedAt: string | null }[];
  profileStats: Record<string, number>;
  users: User[];
  getUserById: (id: string) => User | undefined;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_USER: User = {
  id: '', name: '', username: '', avatar: '', bio: '', course: '', faculty: '', yearOfStudy: 1,
  interests: [], hobbies: [], connectionsCount: 0, postsCount: 0, badges: [], joinedAt: '', isOnline: true,
  privacySettings: { showProfile: 'everyone', showInterests: 'everyone', allowRequests: 'everyone', allowMessages: 'connections-only', showOnlineStatus: true, showRelationship: false },
  wingmanEnabled: false, wingmen: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();

  const currentUser: User = authUser ? {
    ...EMPTY_USER,
    id: authUser.id,
    name: authUser.name,
    username: authUser.username,
    avatar: authUser.avatar || '',
    coverImage: authUser.coverImage || '',
    bio: authUser.bio || '',
    course: authUser.course || '',
    faculty: authUser.faculty || '',
    yearOfStudy: authUser.yearOfStudy || 1,
    interests: authUser.interests || [],
    hobbies: authUser.hobbies || [],
    isOnline: true,
  } : EMPTY_USER;

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [connections, setConnections] = useState<Record<string, string[]>>({});
  const [relationships, setRelationships] = useState<Record<string, string | null>>({});
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [secretAdmirers, setSecretAdmirers] = useState<SecretAdmirer[]>([]);
  const [wingmanSuggestions, setWingmanSuggestions] = useState<WingmanSuggestion[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [badges, setBadges] = useState<{ id: string; name: string; emoji: string; description: string; earned: boolean; earnedAt: string | null }[]>([]);
  const [profileStats, setProfileStats] = useState<Record<string, number>>({});

  const getUserById = useCallback((id: string) => users.find(u => u.id === id) || (id === currentUser.id ? currentUser : undefined), [users, currentUser]);

  useEffect(() => {
    if (currentUser.id) loadFromApi();
  }, [currentUser.id]);

  // Realtime polling — refresh notifications, requests, and conversations every 4s
  useEffect(() => {
    if (!currentUser.id) return;
    const interval = setInterval(() => { pollRealtime(); }, 4000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const pollRealtime = async () => {
    if (!currentUser.id) return;
    try {
      const [notifsRes, reqsRes, convsRes] = await Promise.all([
        fetch(`/api/notifications?userId=${currentUser.id}`),
        fetch(`/api/requests?userId=${currentUser.id}`),
        fetch(`/api/messages?userId=${currentUser.id}`),
      ]);
      if (notifsRes.ok) {
        const fresh = await notifsRes.json();
        setNotifications(prev => {
          // Preserve locally-read state for notifications the server still marks unread lag
          const readIds = new Set(prev.filter((n: Notification) => n.read).map((n: Notification) => n.id));
          return fresh.map((n: Notification) => readIds.has(n.id) ? { ...n, read: true } : n);
        });
      }
      if (reqsRes.ok) setConnectionRequests(await reqsRes.json());
      if (convsRes.ok) {
        const fresh: Conversation[] = await convsRes.json();
        setConversations(prev => {
          // Merge: prefer server data but keep any optimistic (temp) conversations not yet on server
          const serverIds = new Set(fresh.map(c => c.id));
          const localOnly = prev.filter(c => !serverIds.has(c.id) && c.id.startsWith('conv') && !c.id.startsWith('conv_'));
          return [...fresh, ...localOnly];
        });
      }
    } catch { /* ignore poll errors */ }
  };

  const loadFromApi = async () => {
    if (!currentUser.id) return;
    try {
      const [usersRes, reqsRes, notifsRes, postsRes, gamesRes, convsRes, connRes, storiesRes, saRes, wmRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/requests?userId=${currentUser.id}`),
        fetch(`/api/notifications?userId=${currentUser.id}`),
        fetch('/api/posts'),
        fetch('/api/games'),
        fetch(`/api/messages?userId=${currentUser.id}`),
        fetch(`/api/connections?userId=${currentUser.id}`),
        fetch('/api/stories'),
        fetch(`/api/secret-admirers?userId=${currentUser.id}`),
        fetch(`/api/wingman?userId=${currentUser.id}`),
      ]);

      if (usersRes.ok) { const data = await usersRes.json(); setUsers(data.map((u: any) => ({ ...EMPTY_USER, ...u }))); }
      if (reqsRes.ok) setConnectionRequests(await reqsRes.json());
      if (notifsRes.ok) setNotifications(await notifsRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
      if (gamesRes.ok) setGames(await gamesRes.json());
      if (convsRes.ok) setConversations(await convsRes.json());
      if (storiesRes.ok) setStories(await storiesRes.json());
      if (saRes.ok) setSecretAdmirers(await saRes.json());
      if (wmRes.ok) setWingmanSuggestions(await wmRes.json());
      // Badges (computed from activity)
      fetch(`/api/badges?userId=${currentUser.id}`).then(r => r.ok ? r.json() : null).then(d => { if (d) { setBadges(d.badges); setProfileStats(d.stats); } }).catch(() => {});
      if (connRes.ok) {
        const conns = await connRes.json();
        const friendIds = conns.filter((c: any) => c.type === 'friend').map((c: any) => c.connectedUserId);
        const relIds = conns.filter((c: any) => c.type === 'relationship').map((c: any) => c.connectedUserId);
        setConnections(prev => ({ ...prev, [currentUser.id]: friendIds }));
        if (relIds.length > 0) setRelationships(prev => ({ ...prev, [currentUser.id]: relIds[0] }));
      }
    } catch { /* API not available */ }
  };

  const refreshData = useCallback(() => { loadFromApi(); }, [currentUser.id]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    setNotifications(prev => [{ ...notification, id: `n${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markRead', notificationId: id }) }).catch(() => {});
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markAllRead', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const addPost = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev]);
    fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(post) }).catch(() => {});
  }, []);

  const likePost = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = p.likedBy.includes(currentUser.id);
        return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1, likedBy: isLiked ? p.likedBy.filter(id => id !== currentUser.id) : [...p.likedBy, currentUser.id] };
      }
      return p;
    }));
    fetch(`/api/posts/${postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'like', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const savePost = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isSaved = p.savedBy.includes(currentUser.id);
        return { ...p, savedBy: isSaved ? p.savedBy.filter(id => id !== currentUser.id) : [...p.savedBy, currentUser.id] };
      }
      return p;
    }));
    fetch(`/api/posts/${postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const addComment = useCallback((postId: string, content: string) => {
    const c = { id: `c${Date.now()}`, authorId: currentUser.id, content, likes: 0, likedBy: [] as string[], createdAt: new Date().toISOString() };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, c] } : p));
    fetch(`/api/posts/${postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'comment', userId: currentUser.id, content }) }).catch(() => {});
  }, [currentUser.id]);

  const isConnected = useCallback((targetId: string) => (connections[currentUser.id] || []).includes(targetId) || relationships[currentUser.id] === targetId, [connections, relationships, currentUser.id]);

  const getConnectionStatus = useCallback((targetId: string): ConnectionStatus => {
    if ((connections[currentUser.id] || []).includes(targetId)) return 'friends';
    if (relationships[currentUser.id] === targetId) return 'relationship';
    const sent = connectionRequests.find(r => r.fromUserId === currentUser.id && r.toUserId === targetId && r.status === 'pending');
    if (sent) return sent.type === 'friend' ? 'friend-pending-sent' : 'relationship-pending-sent';
    const recv = connectionRequests.find(r => r.fromUserId === targetId && r.toUserId === currentUser.id && r.status === 'pending');
    if (recv) return recv.type === 'friend' ? 'friend-pending-received' : 'relationship-pending-received';
    return 'none';
  }, [connections, relationships, connectionRequests, currentUser.id]);

  const getRequestForUser = useCallback((targetId: string) => connectionRequests.find(r => ((r.fromUserId === currentUser.id && r.toUserId === targetId) || (r.fromUserId === targetId && r.toUserId === currentUser.id)) && r.status === 'pending'), [connectionRequests, currentUser.id]);

  const sendRequest = useCallback(async (toUserId: string, type: RequestType) => {
    if (toUserId === currentUser.id) return;
    if (connectionRequests.find(r => ((r.fromUserId === currentUser.id && r.toUserId === toUserId) || (r.fromUserId === toUserId && r.toUserId === currentUser.id)) && r.status === 'pending')) return;
    const tempId = `cr_${Date.now()}`;
    setConnectionRequests(prev => [...prev, { id: tempId, fromUserId: currentUser.id, toUserId, type, status: 'pending', createdAt: new Date().toISOString() }]);
    try {
      const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromUserId: currentUser.id, toUserId, type }) });
      if (res.ok) { const data = await res.json(); setConnectionRequests(prev => prev.map(r => r.id === tempId ? { ...r, id: data.id } : r)); }
    } catch {}
  }, [currentUser.id, connectionRequests]);

  const cancelRequest = useCallback((requestId: string) => {
    setConnectionRequests(prev => prev.filter(r => r.id !== requestId));
    fetch(`/api/requests/${requestId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const acceptRequest = useCallback(async (requestId: string) => {
    const request = connectionRequests.find(r => r.id === requestId);
    if (!request) return;
    setConnections(prev => ({ ...prev, [currentUser.id]: [...(prev[currentUser.id] || []), request.fromUserId] }));
    if (request.type === 'relationship') setRelationships(prev => ({ ...prev, [currentUser.id]: request.fromUserId }));
    setConnectionRequests(prev => prev.filter(r => r.id !== requestId));
    try {
      await fetch(`/api/requests/${requestId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', userId: currentUser.id }) });
      loadFromApi();
    } catch {}
  }, [connectionRequests, currentUser.id]);

  const rejectRequest = useCallback((requestId: string) => {
    setConnectionRequests(prev => prev.filter(r => r.id !== requestId));
    fetch(`/api/requests/${requestId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const removeFriend = useCallback((userId: string) => {
    setConnections(prev => ({ ...prev, [currentUser.id]: (prev[currentUser.id] || []).filter(id => id !== userId) }));
    if (relationships[currentUser.id] === userId) setRelationships(prev => ({ ...prev, [currentUser.id]: null }));
    fetch(`/api/connections?userId=${currentUser.id}&targetId=${userId}`, { method: 'DELETE' }).catch(() => {});
  }, [currentUser.id, relationships]);

  const getOrCreateDirectConversation = useCallback((userId: string) => {
    if (!isConnected(userId)) return null;
    const existing = conversations.find(c => c.type === 'direct' && c.participants.includes(currentUser.id) && c.participants.includes(userId));
    if (existing) return existing.id;
    // Create via API and reload
    const tempId = `conv${Date.now()}`;
    setConversations(prev => [...prev, { id: tempId, type: 'direct', participants: [currentUser.id, userId], unreadCount: 0, messages: [], createdAt: new Date().toISOString() }]);
    fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id, otherUserId: userId, type: 'direct' }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) { setConversations(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c)); } })
      .catch(() => {});
    return tempId;
  }, [conversations, currentUser.id, isConnected]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!content.trim()) return;
    const msg = { id: `m${Date.now()}`, senderId: currentUser.id, content, timestamp: new Date().toISOString(), read: true };
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, messages: [...c.messages, msg], lastMessage: msg } : c));
    try {
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, senderId: currentUser.id, content }) });
    } catch {}
  }, [currentUser.id]);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c));
    fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const createConversation = useCallback((pIds: string[], name?: string, type: 'direct' | 'group' = 'direct') => {
    const tempId = `conv${Date.now()}`;
    setConversations(prev => [...prev, { id: tempId, type, participants: [currentUser.id, ...pIds], name, unreadCount: 0, messages: [], createdAt: new Date().toISOString(), adminIds: [currentUser.id] }]);
    fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id, type, name, participantIds: pIds }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) setConversations(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c)); })
      .catch(() => {});
    return tempId;
  }, [currentUser.id]);

  const createGame = useCallback(async (type: Game['type'], title: string, data: any): Promise<string | null> => {
    try {
      const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, creatorId: currentUser.id, title, data }) });
      if (res.ok) {
        const game = await res.json();
        setGames(prev => [game, ...prev]);
        return game.id;
      }
    } catch {}
    return null;
  }, [currentUser.id]);

  const voteWouldYouRather = useCallback((gameId: string, option: 'A' | 'B') => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId || g.type !== 'would-you-rather') return g;
      const d = g.data as WouldYouRatherData;
      const a = d.votesA.filter(id => id !== currentUser.id);
      const b = d.votesB.filter(id => id !== currentUser.id);
      if (option === 'A') a.push(currentUser.id); else b.push(currentUser.id);
      return { ...g, data: { ...d, votesA: a, votesB: b } };
    }));
    fetch('/api/games', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, action: 'voteWouldYouRather', userId: currentUser.id, option }) }).catch(() => {});
  }, [currentUser.id]);

  const voteNeverHaveIEver = useCallback((gameId: string, idx: number, response: 'iHave' | 'iHaveNot') => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId || g.type !== 'never-have-i-ever') return g;
      const d = g.data as NeverHaveIEverData;
      const stmts = d.statements.map((s, i) => {
        if (i !== idx) return s;
        const iH = s.iHave.filter(id => id !== currentUser.id);
        const iHN = s.iHaveNot.filter(id => id !== currentUser.id);
        if (response === 'iHave') iH.push(currentUser.id); else iHN.push(currentUser.id);
        return { ...s, iHave: iH, iHaveNot: iHN };
      });
      return { ...g, data: { ...d, statements: stmts } };
    }));
    fetch('/api/games', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, action: 'voteNeverHaveIEver', userId: currentUser.id, statementIndex: idx, response }) }).catch(() => {});
  }, [currentUser.id]);

  const guessTwoTruths = useCallback((gameId: string, guessIndex: number) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId || g.type !== 'two-truths-one-lie') return g;
      const d = g.data as TwoTruthsOneLieData;
      if (d.guesses.find(x => x.userId === currentUser.id)) return g;
      return { ...g, data: { ...d, guesses: [...d.guesses, { userId: currentUser.id, guessIndex }] } };
    }));
    fetch('/api/games', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, action: 'guessTwoTruths', userId: currentUser.id, guessIndex }) }).catch(() => {});
  }, [currentUser.id]);

  const revealTwoTruths = useCallback((gameId: string) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId || g.creatorId !== currentUser.id) return g;
      return { ...g, data: { ...(g.data as TwoTruthsOneLieData), revealed: true } };
    }));
    fetch('/api/games', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, action: 'revealTwoTruths', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const sendSecretAdmirer = useCallback(async (toUserId: string, message: string) => {
    if (toUserId === currentUser.id) return;
    const temp = { id: `sa${Date.now()}`, fromUserId: currentUser.id, toUserId, message, status: 'pending' as const, createdAt: new Date().toISOString(), revealConsent: { from: false, to: false } };
    setSecretAdmirers(prev => [...prev, temp]);
    try {
      const res = await fetch('/api/secret-admirers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromUserId: currentUser.id, toUserId, message }) });
      if (res.ok) { const data = await res.json(); setSecretAdmirers(prev => prev.map(sa => sa.id === temp.id ? data : sa)); }
    } catch {}
  }, [currentUser.id]);

  const respondToAdmirer = useCallback(async (id: string, action: 'curious' | 'reveal' | 'ignored' | 'blocked') => {
    // Optimistic status
    setSecretAdmirers(prev => prev.map(sa => sa.id === id ? { ...sa, status: action === 'curious' ? 'curious' : action === 'reveal' ? sa.status : action } : sa));
    try {
      await fetch('/api/secret-admirers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, userId: currentUser.id }) });
      loadFromApi();
    } catch {}
  }, [currentUser.id]);

  const sendWingmanSuggestion = useCallback(async (forUserId: string, suggestedUserId: string, reason: string) => {
    const temp = { id: `ws${Date.now()}`, wingmanId: currentUser.id, forUserId, suggestedUserId, reason, status: 'pending' as const, createdAt: new Date().toISOString() };
    setWingmanSuggestions(prev => [...prev, temp]);
    try {
      const res = await fetch('/api/wingman', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wingmanId: currentUser.id, forUserId, suggestedUserId, reason }) });
      if (res.ok) { const data = await res.json(); setWingmanSuggestions(prev => prev.map(ws => ws.id === temp.id ? data : ws)); }
    } catch {}
  }, [currentUser.id]);

  const respondToWingman = useCallback((id: string, action: 'accepted' | 'rejected') => {
    setWingmanSuggestions(prev => prev.map(ws => ws.id === id ? { ...ws, status: action } : ws));
    fetch('/api/wingman', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }).catch(() => {});
  }, []);

  const respondToISawYou = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId || !p.iSawYouData || p.iSawYouData.respondents.includes(currentUser.id)) return p;
      return { ...p, iSawYouData: { ...p.iSawYouData, respondents: [...p.iSawYouData.respondents, currentUser.id] } };
    }));
    fetch(`/api/posts/${postId}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const joinEvent = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId || !p.eventData) return p;
      const ed = p.eventData;
      if (ed.participants.includes(currentUser.id) || ed.currentParticipants >= ed.maxParticipants) return p;
      if (ed.joinType === 'approval') return { ...p, eventData: { ...ed, pendingRequests: [...ed.pendingRequests, currentUser.id] } };
      return { ...p, eventData: { ...ed, participants: [...ed.participants, currentUser.id], currentParticipants: ed.currentParticipants + 1 } };
    }));
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, userId: currentUser.id, action: 'join' }) }).catch(() => {});
  }, [currentUser.id]);

  const leaveEvent = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId || !p.eventData || !p.eventData.participants.includes(currentUser.id)) return p;
      return { ...p, eventData: { ...p.eventData, participants: p.eventData.participants.filter(id => id !== currentUser.id), currentParticipants: p.eventData.currentParticipants - 1 } };
    }));
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, userId: currentUser.id, action: 'leave' }) }).catch(() => {});
  }, [currentUser.id]);

  const sharePost = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p));
    fetch(`/api/posts/${postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'share', userId: currentUser.id }) }).catch(() => {});
  }, [currentUser.id]);

  const reportContent = useCallback((targetType: string, targetId: string, reason: string) => {
    fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reporterId: currentUser.id, targetType, targetId, reason }) }).catch(() => {});
  }, [currentUser.id]);

  const deletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    fetch(`/api/posts/${postId}?userId=${currentUser.id}`, { method: 'DELETE' }).catch(() => {});
  }, [currentUser.id]);

  const blockUser = useCallback((userId: string) => {
    setConnections(prev => ({ ...prev, [currentUser.id]: (prev[currentUser.id] || []).filter(id => id !== userId) }));
    if (relationships[currentUser.id] === userId) setRelationships(prev => ({ ...prev, [currentUser.id]: null }));
    setUsers(prev => prev.filter(u => u.id !== userId));
    fetch('/api/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blockerId: currentUser.id, blockedId: userId }) }).catch(() => {});
  }, [currentUser.id, relationships]);

  const createStory = useCallback(async (content: string, image: string | undefined, backgroundColor: string) => {
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content, image, backgroundColor }),
      });
      if (res.ok) {
        const story = await res.json();
        setStories(prev => [story, ...prev]);
      }
    } catch { /* ignore */ }
  }, [currentUser.id]);

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, isAuthenticated: !!authUser,
      posts, addPost, likePost, savePost, addComment,
      connections, relationships, connectionRequests,
      sendRequest, cancelRequest, acceptRequest, rejectRequest, removeFriend, getConnectionStatus, getRequestForUser, isConnected,
      conversations, sendMessage, createConversation, getOrCreateDirectConversation, markConversationRead,
      notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, addNotification,
      games, createGame, voteWouldYouRather, voteNeverHaveIEver, guessTwoTruths, revealTwoTruths,
      secretAdmirers, sendSecretAdmirer, respondToAdmirer,
      wingmanSuggestions, sendWingmanSuggestion, respondToWingman,
      respondToISawYou, joinEvent, leaveEvent,
      stories, createStory,
      sharePost, reportContent, deletePost, blockUser,
      badges, profileStats,
      users, getUserById, refreshData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
