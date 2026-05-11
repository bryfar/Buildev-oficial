import { useCallback, useEffect, useState } from 'react';
import { appStorage, initAppStorage } from '@/utils/app-storage';

export type AppTheme = 'dark' | 'light';

/**
 * Document theme (light/dark) persisted as `buildev-theme` in app storage.
 */
export function useAppTheme() {
  const [theme, setTheme] = useState<AppTheme>('dark');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initAppStorage();
      if (cancelled) return;
      const saved = appStorage.getItem('buildev-theme');
      if (saved === 'light') {
        document.documentElement.classList.add('light');
        setTheme('light');
      } else {
        document.documentElement.classList.remove('light');
        setTheme('dark');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    setTheme(next);
    appStorage.setItem('buildev-theme', next);
  }, [theme]);

  return { theme, toggleTheme };
}
