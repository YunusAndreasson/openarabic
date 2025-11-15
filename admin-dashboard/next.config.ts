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

  experimental: {
    reactCompiler: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-select'],
    scrollRestoration: true,
    optimizeCss: true, // Optimize CSS loading and reduce render-blocking
    cssChunking: 'strict', // Strict CSS chunking for optimal loading
    ppr: false, // Partial Prerendering (not needed for this app)
    after: true, // Enable React 19 after() for cleanup actions
  },

  // Turbopack configuration (Next.js 15.5+)
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
