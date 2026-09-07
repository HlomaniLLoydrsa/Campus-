'use client';

import React, { useState } from 'react';

/**
 * App logo. Drop your own file at /public/images/logo.png to replace the placeholder.
 * Falls back to /images/logo.svg (a simple placeholder) if logo.png is missing.
 */
export default function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  const [src, setSrc] = useState('/images/logo.png');
  return (
    <img
      src={src}
      alt="VYBE logo"
      width={size}
      height={size}
      onError={() => { if (src !== '/images/logo.svg') setSrc('/images/logo.svg'); }}
      className={`rounded-xl object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
