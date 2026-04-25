'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/providers/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  // Render empty placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return <div className="w-8 h-8 flex-shrink-0" aria-hidden="true" />;
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 cursor-pointer flex-shrink-0"
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
