import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kkmnzbeugdoajtzfjkxg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
