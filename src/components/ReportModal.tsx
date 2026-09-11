'use client';

import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { REPORT_REASONS } from '@/lib/reports';
import { useFeedback } from '@/context/FeedbackContext';

/**
 * Reusable report dialog. Requires the user to pick a reason before submitting;
 * an optional description can be added. Posts to /api/reports.
 */
export default function ReportModal({
  targetType,
  targetId,
  onClose,
  onReported,
}: {
  targetType: string;
  targetId: string;
  onClose: () => void;
  onReported?: () => void;
}) {
  const { toast } = useFeedback();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason) { setError('Please choose a reason'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, description }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not submit report'); setBusy(false); return; }
      onReported?.();
      onClose();
      toast('Report submitted. Thanks for keeping VYBE safe.');
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Flag size={18} className="text-red-500" /> Report</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Why are you reporting this? Your report is private.</p>

        {error && <div className="p-2.5 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

        <div className="space-y-1.5 mb-3">
          {REPORT_REASONS.map(r => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-colors ${reason === r.value ? 'border-campus-primary bg-campus-primary/5 text-campus-primary font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Add more detail (optional)"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-campus-primary/20 resize-none mb-4"
        />

        <button onClick={submit} disabled={busy || !reason} className="btn-primary w-full disabled:opacity-50">{busy ? 'Submitting…' : 'Submit report'}</button>
      </div>
    </div>
  );
}
