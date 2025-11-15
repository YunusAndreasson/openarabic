'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    setMounted(true);
    // Get theme from localStorage, default to 'system' if not set
    const stored = localStorage.getItem('openarabic-theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    } else {
      // First visit - default to system and persist it
      localStorage.setItem('openarabic-theme', 'system');
      setTheme('system');
    }
  }, []);

  const cycleTheme = () => {
    let newTheme: Theme;
    if (theme === 'light') {
      newTheme = 'dark';
    } else if (theme === 'dark') {
      newTheme = 'system';
    } else {
      newTheme = 'light';
    }

    setTheme(newTheme);
    localStorage.setItem('openarabic-theme', newTheme);

    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  // Render placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-8 h-8 flex-shrink-0" aria-hidden="true">
        {/* Empty placeholder */}
      </div>
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 cursor-pointer flex-shrink-0 will-change-auto"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      <div className="transition-transform duration-200 ease-out hover:rotate-12">
        {theme === 'light' && <Sun className="h-4 w-4" />}
        {theme === 'dark' && <Moon className="h-4 w-4" />}
        {theme === 'system' && <Monitor className="h-4 w-4" />}
      </div>
    </button>
  );
}
