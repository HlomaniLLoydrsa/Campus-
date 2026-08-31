'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import PostCard from '@/components/posts/PostCard';
import ConnectActions from '@/components/connections/ConnectActions';
import Avatar from '@/components/Avatar';
import { useApp } from '@/context/AppContext';
import { Heart, Eye, Sparkles, Users, Zap, X, TrendingUp, Calendar, HelpCircle, Megaphone, Gamepad2, Flame, Compass } from 'lucide-react';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/utils';

interface GameCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  gradient: string;
  bgImage?: string;
  link?: string;
  isGame?: boolean;
}

const exploreCards: GameCard[] = [
  { id: 'would-you-rather', title: 'Would You Rather', description: 'Choose between two options', emoji: '🤔', gradient: 'from-blue-500 to-indigo-600', bgImage: '/images/wyr-bg.svg', isGame: true },
  { id: 'never-have-i-ever', title: 'Never Have I Ever', description: 'Find out what others have done', emoji: '🙈', gradient: 'from-pink-500 to-rose-600', bgImage: '/images/nhie-bg.svg', isGame: true },
  { id: 'two-truths-one-lie', title: 'Two Truths, One Lie', description: 'Guess which one is the lie', emoji: '🎭', gradient: 'from-emerald-500 to-green-600', bgImage: '/images/ttol-bg.svg', isGame: true },
  { id: 'secret-admirer', title: 'Secret Admirer', description: 'Send anonymous appreciation', emoji: '💘', gradient: 'from-pink-400 to-red-500', bgImage: '/images/admirer-bg.svg', link: '/secret-admirer' },
  { id: 'i-saw-you', title: 'I Saw You', description: 'Missed connections on campus', emoji: '👀', gradient: 'from-violet-500 to-purple-600', bgImage: '/images/isawu-bg.svg', link: '/i-saw-you' },
  { id: 'wingman', title: 'Wingman Mode', description: 'Let friends help you connect', emoji: '🏹', gradient: 'from-indigo-500 to-blue-600', bgImage: '/images/wingman-bg.svg', link: '/wingman' },
];

const TABS = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'people', label: 'People', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'shoutouts', label: 'Shoutouts', icon: Megaphone },
  { id: 'games', label: 'Games', icon: Gamepad2 },
];

export default function ExplorePage() {
  const { games, users, posts, currentUser, connections, getConnectionStatus } = useApp();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<'friend' | 'random' | null>(null);
  const [tab, setTab] = useState('discover');

  const myFriends = (connections[currentUser.id] || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  const activeGames = games.filter(g => g.status === 'active');

  const engagement = (p: any) => (p.likes || 0) + (p.comments?.length || 0) * 2 + (p.shares || 0) * 3;
  const trendingPosts = [...posts].filter(p => p.type !== 'confession').sort((a, b) => engagement(b) - engagement(a)).slice(0, 10);
  const trendingConfessions = posts.filter(p => p.type === 'confession').sort((a, b) => engagement(b) - engagement(a));
  const events = posts.filter(p => p.eventData);
  const questions = posts.filter(p => p.type === 'question').sort((a, b) => engagement(b) - engagement(a));
  const shoutouts = posts.filter(p => p.type === 'shoutout').sort((a, b) => engagement(b) - engagement(a));
  const discoverPeople = users.filter(u => {
    if (u.id === currentUser.id) return false;
    const s = getConnectionStatus(u.id);
    return s !== 'friends' && s !== 'relationship';
  });

  const handleCardClick = (card: GameCard) => {
    if (card.link) return;
    if (card.isGame) { setSelectedCard(card.id); setPlayMode(null); }
  };

  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="card p-8 text-center">
      <Icon size={36} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold gradient-text">Explore</h1>
            <p className="text-sm text-gray-500 mt-1">Play, discover, and connect with campus</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5 -mx-1 px-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-campus-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* DISCOVER (feature launcher) */}
          {tab === 'discover' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {exploreCards.map(card => {
                  const cardInner = (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
                      {/* Subtle decorative circles for depth */}
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                      <div className="absolute bottom-10 -left-8 w-20 h-20 rounded-full bg-white/10" />
                      <div className="relative h-full flex flex-col justify-between p-4">
                        <span className="text-4xl drop-shadow-lg">{card.emoji}</span>
                        <div>
                          <h3 className="font-bold text-white text-sm drop-shadow">{card.title}</h3>
                          <p className="text-white/90 text-xs mt-0.5 drop-shadow">{card.description}</p>
                          {card.isGame && activeGames.filter(g => g.type === card.id).length > 0 && (
                            <span className="mt-2 inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] text-white font-medium w-fit">
                              <Zap size={10} /> {activeGames.filter(g => g.type === card.id).length} live
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  );
                  return card.link ? (
                    <Link key={card.id} href={card.link} className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform shadow-md">{cardInner}</Link>
                  ) : (
                    <div key={card.id} onClick={() => handleCardClick(card)} className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform shadow-md">{cardInner}</div>
                  );
                })}
              </div>

              {/* Campus Activity strip */}
              <div className="card p-4 mt-5 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-100">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3"><Flame size={16} className="text-orange-500" /> Campus Activity</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div><p className="text-xl font-bold text-campus-primary">{posts.length}</p><p className="text-[11px] text-gray-500">Posts today</p></div>
                  <div><p className="text-xl font-bold text-campus-accent">{activeGames.length}</p><p className="text-[11px] text-gray-500">Live games</p></div>
                  <div><p className="text-xl font-bold text-green-500">{events.length}</p><p className="text-[11px] text-gray-500">Events</p></div>
                  <div><p className="text-xl font-bold text-blue-500">{users.length}</p><p className="text-[11px] text-gray-500">Students</p></div>
                </div>
              </div>
            </>
          )}

          {/* TRENDING */}
          {tab === 'trending' && (
            <div className="space-y-5">
              <section>
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-orange-500" /> Trending Posts</h3>
                {trendingPosts.length ? <div className="space-y-4">{trendingPosts.map(p => <PostCard key={p.id} post={p} />)}</div> : <EmptyState icon={TrendingUp} text="No trending posts yet. Be the first to post!" />}
              </section>
              <section>
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3">🤫 Trending Confessions</h3>
                {trendingConfessions.length ? <div className="space-y-4">{trendingConfessions.map(p => <PostCard key={p.id} post={p} />)}</div> : <EmptyState icon={Sparkles} text="No confessions yet. Share one anonymously!" />}
              </section>
            </div>
          )}

          {/* PEOPLE */}
          {tab === 'people' && (
            <div className="space-y-3">
              {discoverPeople.length ? discoverPeople.map(u => (
                <div key={u.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <Link href={`/profile/${u.id}`}><Avatar src={u.avatar} name={u.name} size={48} online={u.isOnline} /></Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${u.id}`} className="font-semibold text-sm hover:text-campus-primary transition-colors">{u.name}</Link>
                      <p className="text-xs text-gray-500">{u.course}{u.yearOfStudy ? ` · Year ${u.yearOfStudy}` : ''}</p>
                      {u.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">{u.interests.slice(0, 3).map(i => <span key={i} className="badge-pill bg-gray-100 text-gray-600 text-[10px]">{i}</span>)}</div>
                      )}
                      <div className="mt-3"><ConnectActions userId={u.id} status={getConnectionStatus(u.id)} compact /></div>
                    </div>
                  </div>
                </div>
              )) : <EmptyState icon={Users} text="No new people to discover right now." />}
            </div>
          )}

          {/* EVENTS */}
          {tab === 'events' && (
            <div className="space-y-4">
              {events.length ? events.map(p => <PostCard key={p.id} post={p} />) : (
                <div className="card p-8 text-center">
                  <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">No events yet</p>
                  <Link href="/events" className="btn-primary text-sm mt-3 inline-block">Create an Event</Link>
                </div>
              )}
            </div>
          )}

          {/* QUESTIONS */}
          {tab === 'questions' && (
            <div className="space-y-4">
              {questions.length ? questions.map(p => <PostCard key={p.id} post={p} />) : <EmptyState icon={HelpCircle} text="No questions yet. Ask the campus something!" />}
            </div>
          )}

          {/* SHOUTOUTS */}
          {tab === 'shoutouts' && (
            <div className="space-y-4">
              {shoutouts.length ? shoutouts.map(p => <PostCard key={p.id} post={p} />) : <EmptyState icon={Megaphone} text="No shoutouts yet. Appreciate someone!" />}
            </div>
          )}

          {/* GAMES */}
          {tab === 'games' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Active Games ({activeGames.length})</h3>
                <Link href="/games" className="text-xs text-campus-primary font-medium">Open Games →</Link>
              </div>
              {activeGames.length ? activeGames.map(g => {
                const creator = users.find(u => u.id === g.creatorId);
                return (
                  <Link key={g.id} href="/games" className="card p-4 block hover:scale-[1.01] transition-transform">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="badge-pill bg-indigo-100 text-indigo-700 text-xs mb-1">
                          {g.type === 'would-you-rather' ? '🤔 Would You Rather' : g.type === 'two-truths-one-lie' ? '🎭 Two Truths One Lie' : '🙈 Never Have I Ever'}
                        </span>
                        <h4 className="font-semibold text-sm mt-1">{g.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">by {creator?.name || 'Someone'} · {formatTimeAgo(g.createdAt)}</p>
                      </div>
                      <div className="text-right"><p className="flex items-center gap-1 text-xs text-gray-500"><Users size={12} /> {g.participants.length}</p><span className="btn-primary text-xs mt-2 inline-block">Play</span></div>
                    </div>
                  </Link>
                );
              }) : (
                <div className="card p-8 text-center">
                  <Gamepad2 size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">No active games</p>
                  <Link href="/games" className="btn-primary text-sm mt-3 inline-block">Create a Game</Link>
                </div>
              )}
            </div>
          )}

          {/* Play mode modal */}
          {selectedCard && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg">
                    {selectedCard === 'would-you-rather' ? '🤔 Would You Rather' : selectedCard === 'never-have-i-ever' ? '🙈 Never Have I Ever' : '🎭 Two Truths, One Lie'}
                  </h3>
                  <button onClick={() => { setSelectedCard(null); setPlayMode(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
                </div>
                {!playMode ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">How would you like to play?</p>
                    <button onClick={() => setPlayMode('friend')} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-campus-primary hover:bg-campus-primary/5 transition-all text-left">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-campus-primary/10 flex items-center justify-center"><Users size={20} className="text-campus-primary" /></div><div><p className="font-semibold text-sm">Play with a Friend</p><p className="text-xs text-gray-500">Invite a friend to play together</p></div></div>
                    </button>
                    <Link href="/games" onClick={() => setSelectedCard(null)} className="block w-full p-4 rounded-xl border-2 border-gray-200 hover:border-campus-accent hover:bg-campus-accent/5 transition-all text-left">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-campus-accent/10 flex items-center justify-center"><Zap size={20} className="text-campus-accent" /></div><div><p className="font-semibold text-sm">Play with Anyone</p><p className="text-xs text-gray-500">Join a game with people online</p></div></div>
                    </Link>
                  </div>
                ) : playMode === 'friend' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-2">Select a friend to play with:</p>
                    {myFriends.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {myFriends.map(friend => friend && (
                          <Link href="/games" key={friend.id} onClick={() => setSelectedCard(null)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                            <Avatar src={friend.avatar} name={friend.name} size={40} />
                            <div className="flex-1"><p className="font-medium text-sm">{friend.name}</p><p className="text-xs text-gray-500">@{friend.username}</p></div>
                            <span className="text-xs text-campus-primary font-medium">Invite</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400"><p className="text-sm">No friends yet</p><Link href="/connections" className="text-xs text-campus-primary font-medium">Find people to connect with</Link></div>
                    )}
                    <button onClick={() => setPlayMode(null)} className="btn-secondary w-full text-sm">Back</button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
