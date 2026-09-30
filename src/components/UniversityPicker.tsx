'use client';

import React, { useState } from 'react';
import { SA_UNIVERSITIES, UNIVERSITY_OTHER } from '@/lib/universities';

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A dropdown of South African universities (alphabetical) plus an "Other" option
 * that reveals a text field so users can type an institution not in the list.
 */
export default function UniversityPicker({ value, onChange, className = 'input-field' }: Props) {
  // If the current value isn't a known university (and isn't empty), we're in "Other" mode.
  const isKnown = !value || SA_UNIVERSITIES.includes(value);
  const [other, setOther] = useState(!isKnown);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === UNIVERSITY_OTHER) {
      setOther(true);
      onChange(''); // clear so the typed value starts fresh
    } else {
      setOther(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <select value={other ? UNIVERSITY_OTHER : value} onChange={handleSelect} className={className}>
        <option value="">Select your university…</option>
        {SA_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
        <option value={UNIVERSITY_OTHER}>Other (type it in)</option>
      </select>
      {other && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your university"
          className={className}
          autoFocus
        />
      )}
    </div>
  );
}
