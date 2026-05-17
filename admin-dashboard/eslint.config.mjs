import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      'cloudflare-env.d.ts',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    rules: {
      // Catch hand-rolled <img> on a Next.js project — next/image is required
      '@next/next/no-img-element': 'error',
      // Flag missing alt text on images for a11y
      'jsx-a11y/alt-text': 'error',
    },
  },
];
