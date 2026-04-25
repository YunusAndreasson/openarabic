'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      storageKey="openarabic-theme"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { resolvedTheme, theme, setTheme } = useNextTheme();
  return {
    isDark: resolvedTheme === 'dark',
    theme: theme as 'light' | 'dark' | 'system',
    setTheme,
  };
}
