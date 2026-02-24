'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  console.log('ThemeToggle render', { theme, mounted });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // don't render anything on server or before hydration to avoid mismatches
    return null;
  }

  return (
    <button
      onClick={() => { console.log('toggle clicked, current theme', theme); toggle(); }}
      className="rounded-full p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      aria-label="Toggle light / dark theme"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
