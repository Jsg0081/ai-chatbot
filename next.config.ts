import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'i.scdn.co',
      },
      {
        hostname: 'mosaic.scdn.co',
      },
      {
        hostname: 'image-cdn-ak.spotifycdn.com',
      },
      {
        hostname: 'image-cdn-fa.spotifycdn.com',
      },
    ],
  },
};

export default nextConfig; 