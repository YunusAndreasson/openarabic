import type { NextConfig } from 'next';
import path from 'path';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Initialize OpenNext for Cloudflare development
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // React Compiler (moved to top-level in Next.js 16)
  reactCompiler: true,

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
    ],
  },

  // Turbopack configuration
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  images: {
    unoptimized: true, // Cloudflare image resizing not available on Pages
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
