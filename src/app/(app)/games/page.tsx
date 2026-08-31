'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { Gamepad2, Users, ArrowLeft, Check, Plus, X, Trash2 } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { WouldYouRatherData, NeverHaveIEverData, TwoTruthsOneLieData, Game } from '@/types';

export default function GamesPage() {
  const { games, currentUser, getUserById, createGame, voteWouldYouRather, voteNeverHaveIEver, guessTwoTruths, revealTwoTruths } = useApp();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const activeGames = games.filter(g => g.status === 'active');
  const selected = games.find(g => g.id === selectedGame);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><Gamepad2 className="text-campus-primary" /> Social Games</h1>
              <p className="text-sm text-gray-500 mt-1">Play fun games with your campus friends</p>
            </div>
            {!selectedGame && <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Create</button>}
          </div>

          {showCreate && <CreateGameModal onClose={() => setShowCreate(false)} onCreate={createGame} />}

          {/* Game type cards */}
          {!selectedGame && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="card p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                  <p className="text-2xl mb-1">🤔</p>
                  <p className="text-xs font-semibold text-gray-700">Would You Rather</p>
                </div>
                <div className="card p-4 text-center bg-gradient-to-br from-pink-50 to-red-50 border-pink-100">
                  <p className="text-2xl mb-1">🙈</p>
                  <p className="text-xs font-semibold text-gray-700">Never Have I Ever</p>
                </div>
                <div className="card p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100">
                  <p className="text-2xl mb-1">🎭</p>
                  <p className="text-xs font-semibold text-gray-700">Two Truths One Lie</p>
                </div>
              </div>

              <h2 className="font-bold text-lg mb-4">Active Games ({activeGames.length})</h2>
              {activeGames.length === 0 ? (
                <div className="card p-8 text-center">
                  <Gamepad2 size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No active games</p>
                  <p className="text-sm text-gray-400 mt-1">Start a new game and invite friends!</p>
                  <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4 inline-flex items-center gap-1"><Plus size={14} /> Create a Game</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeGames.map(game => {
                    const creator = getUserById(game.creatorId);
                    return (
                      <div key={game.id} onClick={() => setSelectedGame(game.id)} className="card p-4 cursor-pointer hover:scale-[1.01] transition-transform">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="badge-pill bg-indigo-100 text-indigo-700 text-xs mb-1">
                              {game.type === 'would-you-rather' ? '🤔 Would You Rather' : game.type === 'two-truths-one-lie' ? '🎭 Two Truths One Lie' : '🙈 Never Have I Ever'}
                            </span>
                            <h3 className="font-semibold mt-1">{game.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">by {creator?.name} · {formatTimeAgo(game.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="flex items-center gap-1 text-xs text-gray-500"><Users size={12} /> {game.participants.length}</p>
                            <span className="btn-primary text-xs mt-2 inline-block">Play</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Game detail view */}
          {selected && (
            <div className="animate-fade-in">
              <button onClick={() => setSelectedGame(null)} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline">
                <ArrowLeft size={14} /> Back to games
              </button>

              {/* WOULD YOU RATHER */}
              {selected.type === 'would-you-rather' && (() => {
                const data = selected.data as WouldYouRatherData;
                const totalVotes = data.votesA.length + data.votesB.length;
                const votedA = data.votesA.includes(currentUser.id);
                const votedB = data.votesB.includes(currentUser.id);
                const hasVoted = votedA || votedB;
                const percentA = totalVotes > 0 ? Math.round((data.votesA.length / totalVotes) * 100) : 50;
                const percentB = 100 - percentA;

                return (
                  <div className="card p-6">
                    <div className="text-center mb-6">
                      <span className="text-3xl">🤔</span>
                      <h2 className="font-bold text-lg mt-2">{selected.title}</h2>
                      <p className="text-xs text-gray-500">{totalVotes} votes · {selected.participants.length} players</p>
                    </div>
                    <div className="space-y-4">
                      <button
                        onClick={() => voteWouldYouRather(selected.id, 'A')}
                        className={`w-full p-5 rounded-xl border-2 text-left transition-all ${votedA ? 'border-campus-primary bg-campus-primary/5 ring-2 ring-campus-primary/20' : 'border-gray-200 hover:border-campus-primary/50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{data.optionA}</p>
                          {hasVoted && <span className="text-lg font-bold text-campus-primary">{percentA}%</span>}
                        </div>
                        {hasVoted && <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-campus-primary rounded-full transition-all duration-500" style={{ width: `${percentA}%` }} /></div>}
                        {votedA && <p className="text-xs text-campus-primary mt-2 flex items-center gap-1"><Check size={12} /> Your choice</p>}
                      </button>
                      <div className="text-center text-xs font-bold text-gray-400 py-1">OR</div>
                      <button
                        onClick={() => voteWouldYouRather(selected.id, 'B')}
                        className={`w-full p-5 rounded-xl border-2 text-left transition-all ${votedB ? 'border-campus-accent bg-campus-accent/5 ring-2 ring-campus-accent/20' : 'border-gray-200 hover:border-campus-accent/50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{data.optionB}</p>
                          {hasVoted && <span className="text-lg font-bold text-campus-accent">{percentB}%</span>}
                        </div>
                        {hasVoted && <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-campus-accent rounded-full transition-all duration-500" style={{ width: `${percentB}%` }} /></div>}
                        {votedB && <p className="text-xs text-campus-accent mt-2 flex items-center gap-1"><Check size={12} /> Your choice</p>}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* TWO TRUTHS ONE LIE */}
              {selected.type === 'two-truths-one-lie' && (() => {
                const data = selected.data as TwoTruthsOneLieData;
                const creator = getUserById(selected.creatorId);
                const myGuess = data.guesses.find(g => g.userId === currentUser.id);
                const isCreator = selected.creatorId === currentUser.id;

                return (
                  <div className="card p-6">
                    <div className="text-center mb-6">
                      <span className="text-3xl">🎭</span>
                      <h2 className="font-bold text-lg mt-2">{selected.title}</h2>
                      <p className="text-xs text-gray-500">by {creator?.name} · {data.guesses.length} guesses</p>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 text-center font-medium">Which one is the lie?</p>
                    <div className="space-y-3">
                      {data.statements.map((s, i) => {
                        const isMyGuess = myGuess?.guessIndex === i;
                        const isCorrectLie = data.revealed && s.isLie;
                        const isWrongGuess = data.revealed && isMyGuess && !s.isLie;
                        return (
                          <button
                            key={i}
                            onClick={() => !myGuess && !isCreator && guessTwoTruths(selected.id, i)}
                            disabled={!!myGuess || isCreator}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                              isCorrectLie ? 'border-red-400 bg-red-50' :
                              isWrongGuess ? 'border-orange-300 bg-orange-50' :
                              isMyGuess ? 'border-campus-accent bg-campus-accent/5' :
                              'border-gray-200 hover:border-campus-primary/50 disabled:hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                              <p className="text-sm font-medium flex-1">{s.text}</p>
                              {isMyGuess && !data.revealed && <span className="text-xs text-campus-accent font-medium">Your guess</span>}
                            </div>
                            {data.revealed && (
                              <p className={`text-xs font-medium mt-2 ml-11 ${s.isLie ? 'text-red-500' : 'text-green-500'}`}>
                                {s.isLie ? '❌ This is the lie!' : '✅ Truth'}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {isCreator && !data.revealed && (
                      <button onClick={() => revealTwoTruths(selected.id)} className="btn-primary w-full mt-4">Reveal Answer</button>
                    )}
                    {!isCreator && !myGuess && !data.revealed && (
                      <p className="text-xs text-gray-400 text-center mt-4">Tap the statement you think is the lie</p>
                    )}
                  </div>
                );
              })()}

              {/* NEVER HAVE I EVER */}
              {selected.type === 'never-have-i-ever' && (() => {
                const data = selected.data as NeverHaveIEverData;
                return (
                  <div className="card p-6">
                    <div className="text-center mb-6">
                      <span className="text-3xl">🙈</span>
                      <h2 className="font-bold text-lg mt-2">{selected.title}</h2>
                      <p className="text-xs text-gray-500">{selected.participants.length} players</p>
                    </div>
                    <div className="space-y-5">
                      {data.statements.map((s, i) => {
                        const totalResponses = s.iHave.length + s.iHaveNot.length;
                        const havePercent = totalResponses > 0 ? Math.round((s.iHave.length / totalResponses) * 100) : 0;
                        const userHas = s.iHave.includes(currentUser.id);
                        const userHasNot = s.iHaveNot.includes(currentUser.id);
                        const hasResponded = userHas || userHasNot;

                        return (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl">
                            <p className="font-medium text-sm mb-3">Never have I ever... <span className="text-gray-700">{s.text.toLowerCase()}</span></p>
                            <div className="flex gap-2 mb-2">
                              <button
                                onClick={() => voteNeverHaveIEver(selected.id, i, 'iHave')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${userHas ? 'bg-campus-accent text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-campus-accent'}`}
                              >
                                I have 😳 ({s.iHave.length})
                              </button>
                              <button
                                onClick={() => voteNeverHaveIEver(selected.id, i, 'iHaveNot')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${userHasNot ? 'bg-campus-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-campus-primary'}`}
                              >
                                Never 😇 ({s.iHaveNot.length})
                              </button>
                            </div>
                            {hasResponded && totalResponses > 0 && (
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-campus-accent rounded-full transition-all duration-500" style={{ width: `${havePercent}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}


function CreateGameModal({ onClose, onCreate }: { onClose: () => void; onCreate: (type: Game['type'], title: string, data: any) => Promise<string | null> }) {
  const [type, setType] = useState<Game['type']>('would-you-rather');
  const [title, setTitle] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [nhieStatements, setNhieStatements] = useState<string[]>(['', '', '']);
  const [ttolStatements, setTtolStatements] = useState<string[]>(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) { setError('Give your game a title'); return; }

    let data: any = {};
    if (type === 'would-you-rather') {
      if (!optionA.trim() || !optionB.trim()) { setError('Both options are required'); return; }
      data = { optionA, optionB };
    } else if (type === 'never-have-i-ever') {
      const filled = nhieStatements.filter(s => s.trim());
      if (filled.length === 0) { setError('Add at least one statement'); return; }
      data = { statements: filled.map(text => ({ text })) };
    } else if (type === 'two-truths-one-lie') {
      if (ttolStatements.some(s => !s.trim())) { setError('Fill in all 3 statements'); return; }
      if (lieIndex === null) { setError('Mark which statement is the lie'); return; }
      data = { statements: ttolStatements.map((text, i) => ({ text, isLie: i === lieIndex })) };
    }

    setSaving(true);
    const id = await onCreate(type, title.trim(), data);
    setSaving(false);
    if (id) onClose();
    else setError('Failed to create game. Try again.');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">Create a Game</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>

        {error && <div className="p-3 mb-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            { t: 'would-you-rather', emoji: '🤔', label: 'Would You Rather' },
            { t: 'never-have-i-ever', emoji: '🙈', label: 'Never Have I Ever' },
            { t: 'two-truths-one-lie', emoji: '🎭', label: 'Two Truths' },
          ] as const).map(opt => (
            <button key={opt.t} onClick={() => setType(opt.t)} className={`p-3 rounded-xl border-2 text-center transition-all ${type === opt.t ? 'border-campus-primary bg-campus-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <p className="text-2xl mb-1">{opt.emoji}</p>
              <p className="text-[10px] font-medium leading-tight">{opt.label}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Game Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Campus Life Edition" className="input-field" />
          </div>

          {type === 'would-you-rather' && (
            <>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Option A</label><input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} placeholder="Never use campus WiFi again" className="input-field" /></div>
              <div className="text-center text-xs font-bold text-gray-400">OR</div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Option B</label><input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} placeholder="Never use mobile data again" className="input-field" /></div>
            </>
          )}

          {type === 'never-have-i-ever' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Statements (people react with "I have" / "Never")</label>
              {nhieStatements.map((s, i) => (
                <input key={i} type="text" value={s} onChange={(e) => setNhieStatements(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Never have I ever... (${i + 1})`} className="input-field" />
              ))}
              <button onClick={() => setNhieStatements(prev => [...prev, ''])} className="text-xs text-campus-primary font-medium">+ Add another statement</button>
            </div>
          )}

          {type === 'two-truths-one-lie' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Write 3 statements, then tap the one that&apos;s a lie</label>
              {ttolStatements.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={s} onChange={(e) => setTtolStatements(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Statement ${i + 1}`} className="input-field flex-1" />
                  <button onClick={() => setLieIndex(i)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${lieIndex === i ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {lieIndex === i ? 'The Lie' : 'Mark lie'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleCreate} disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving ? 'Creating...' : 'Create Game'}</button>
        </div>
      </div>
    </div>
  );
}
