'use client';

import React, { useState } from 'react';

/**
 * App logo. Drop your own file at /public/images/logo.png to replace the placeholder.
 * Falls back to /images/logo.svg (a simple placeholder) if logo.png is missing.
 */
export default function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  // Try common logo filenames in order, falling back to the placeholder SVG.
  const candidates = ['/images/logo.png', '/images/logo.jpg', '/images/logo.svg'];
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  return (
    <img
      src={src}
      alt="VYBE logo"
      width={size}
      height={size}
      onError={() => { if (idx < candidates.length - 1) setIdx(idx + 1); }}
      className={`rounded-xl object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
