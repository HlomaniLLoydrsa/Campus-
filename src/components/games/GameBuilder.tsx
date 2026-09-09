'use client';

import React, { useState } from 'react';
import type { Game } from '@/types';

const GAME_LABELS: Record<Game['type'], string> = {
  'would-you-rather': 'Would You Rather',
  'never-have-i-ever': 'Never Have I Ever',
  'two-truths-one-lie': 'Two Truths, One Lie',
};

/**
 * Builds the conditions for a game. The title is auto-filled from the game type
 * (the user already picked which game), so there is no title input.
 * Calls onSubmit(data) with the normalized game data.
 */
export default function GameBuilder({
  type,
  submitLabel,
  onSubmit,
  onBack,
}: {
  type: Game['type'];
  submitLabel: string;
  onSubmit: (title: string, data: any) => Promise<void> | void;
  onBack?: () => void;
}) {
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [nhie, setNhie] = useState<string[]>(['', '', '']);
  const [ttol, setTtol] = useState<string[]>(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    let data: any = {};
    if (type === 'would-you-rather') {
      if (!optionA.trim() || !optionB.trim()) { setError('Both options are required'); return; }
      data = { optionA: optionA.trim(), optionB: optionB.trim() };
    } else if (type === 'never-have-i-ever') {
      const filled = nhie.filter(s => s.trim());
      if (filled.length === 0) { setError('Add at least one statement'); return; }
      data = { statements: filled.map(text => ({ text: text.trim() })) };
    } else if (type === 'two-truths-one-lie') {
      if (ttol.some(s => !s.trim())) { setError('Fill in all 3 statements'); return; }
      if (lieIndex === null) { setError('Mark which statement is the lie'); return; }
      data = { statements: ttol.map((text, i) => ({ text: text.trim(), isLie: i === lieIndex })) };
    }
    setBusy(true);
    // Title is auto-derived from the game type.
    await onSubmit(GAME_LABELS[type], data);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

      {type === 'would-you-rather' && (
        <>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Option A</label><input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} placeholder="Never use campus WiFi again" className="input-field" /></div>
          <div className="text-center text-xs font-bold text-gray-400">OR</div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Option B</label><input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} placeholder="Never use mobile data again" className="input-field" /></div>
        </>
      )}

      {type === 'never-have-i-ever' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 block">Statements (people react &quot;I have&quot; / &quot;Never&quot;)</label>
          {nhie.map((s, i) => (
            <input key={i} type="text" value={s} onChange={(e) => setNhie(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Never have I ever... (${i + 1})`} className="input-field" />
          ))}
          <button type="button" onClick={() => setNhie(prev => [...prev, ''])} className="text-xs text-campus-primary font-medium">+ Add another statement</button>
        </div>
      )}

      {type === 'two-truths-one-lie' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 block">Write 3 statements, then tap the lie</label>
          {ttol.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={s} onChange={(e) => setTtol(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Statement ${i + 1}`} className="input-field flex-1" />
              <button type="button" onClick={() => setLieIndex(i)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${lieIndex === i ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {lieIndex === i ? 'The Lie' : 'Mark lie'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {onBack && <button type="button" onClick={onBack} className="btn-secondary flex-1 text-sm">Back</button>}
        <button type="button" onClick={handleSubmit} disabled={busy} className="btn-primary flex-1 disabled:opacity-50">{busy ? 'Please wait…' : submitLabel}</button>
      </div>
    </div>
  );
}
