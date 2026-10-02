import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  // Redirect the old static /uploads/<file> URL pattern (written by local dev before
  // the storage fix) to the canonical /api/uploads/<file> API route so any legacy
  // URLs already stored in the DB continue to resolve correctly.
  async rewrites() {
    return [
      {
        source: '/uploads/:filename',
        destination: '/api/uploads/:filename',
      },
    ];
  },
};

export default nextConfig;
