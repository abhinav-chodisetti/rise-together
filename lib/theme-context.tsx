import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'react-native-css';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from '../constants/theme';

type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (next: boolean) => void;
  colors: ThemeColors;
  isHydrated: boolean;
};

const STORAGE_KEY = 'risetogether.theme.v1';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDarkState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (cancelled) return;
        if (json) {
          try {
            const parsed = JSON.parse(json);
            if (typeof parsed === 'boolean') {
              setIsDarkState(parsed);
              colorScheme.set(parsed ? 'dark' : 'light');
            }
          } catch {
            // ignore
          }
        } else {
          colorScheme.set('light');
        }
        setIsHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep NativeWind's active color scheme in sync with our toggle so that
  // every compiled `bg-surface`, `text-primary-text`, etc. resolves against
  // the dark variant defined in global.css.
  useEffect(() => {
    colorScheme.set(isDark ? 'dark' : 'light');
  }, [isDark]);

  const setIsDark = useCallback((next: boolean) => {
    setIsDarkState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, setIsDark, colors, isHydrated }),
    [isDark, setIsDark, colors, isHydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
