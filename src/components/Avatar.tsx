'use client';

import React from 'react';

interface Props {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  online?: boolean;
}

export default function Avatar({ src, name, size = 40, className = '', online }: Props) {
  const initial = (name || '?')[0].toUpperCase();
  const fontSize = Math.round(size * 0.4);

  return (
    <div className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name || ''} className={`rounded-full object-cover w-full h-full ${className}`} />
      ) : (
        <div className={`rounded-full bg-campus-primary/10 flex items-center justify-center w-full h-full ${className}`}>
          <span className="text-campus-primary font-bold" style={{ fontSize }}>{initial}</span>
        </div>
      )}
      {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
    </div>
  );
}
