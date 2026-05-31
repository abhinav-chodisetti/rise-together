import AsyncStorage from '@react-native-async-storage/async-storage';
// `vars` is the runtime CSS-variable cascade in react-native-css. The
// library marks the signature as deprecated (hint-level) but it's still the
// supported way to push variables down the tree at runtime — raw `--*`
// style keys don't propagate to NativeWind class lookups. Keep using it
// until the library ships a replacement we can verify.
// eslint-disable-next-line @typescript-eslint/no-deprecated
import { colorScheme, vars } from 'react-native-css';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  PALETTES,
  type PaletteId,
  type ThemeColors,
  type ThemeFonts,
} from '../constants/theme';

type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (next: boolean) => void;
  colors: ThemeColors;
  palette: PaletteId;
  setPalette: (next: PaletteId) => void;
  isHydrated: boolean;
};

const THEME_STORAGE_KEY = 'risetogether.theme.v1';
const PALETTE_STORAGE_KEY = 'risetogether.palette.v1';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDarkState] = useState(false);
  const [palette, setPaletteState] = useState<PaletteId>('default');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(PALETTE_STORAGE_KEY),
    ])
      .then(([themeJson, paletteRaw]) => {
        if (cancelled) return;
        let initialDark = false;
        if (themeJson) {
          try {
            const parsed = JSON.parse(themeJson);
            if (typeof parsed === 'boolean') initialDark = parsed;
          } catch {
            // ignore
          }
        }
        setIsDarkState(initialDark);
        colorScheme.set(initialDark ? 'dark' : 'light');

        if (paletteRaw === 'hype' || paletteRaw === 'default') {
          setPaletteState(paletteRaw);
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
    AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next);
    AsyncStorage.setItem(PALETTE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const colors = isDark ? PALETTES[palette].dark : PALETTES[palette].light;

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, setIsDark, colors, palette, setPalette, isHydrated }),
    [isDark, setIsDark, colors, palette, setPalette, isHydrated],
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

export function useThemeFonts(): ThemeFonts {
  const { palette } = useTheme();
  return PALETTES[palette].fonts;
}

// Returns a style object that overrides global.css's color CSS variables for
// the active (palette, isDark) combo, so NativeWind classes (`bg-primary`,
// `text-primary-text`, etc.) pick up the swap at runtime — not just inline
// `style={{ color: colors.primary }}` usage. Apply to a View wrapping the
// app's screen tree (e.g. inside ThemedRoot in `app/_layout.tsx`).
//
// When palette === 'default', returns an empty style so global.css defaults
// apply. The dark-mode @media block in global.css still handles dark for the
// default palette; for Hype dark we explicitly push the dark hex values.
export function usePaletteVars() {
  const { palette, isDark } = useTheme();
  if (palette === 'default') return undefined;
  const c = isDark ? PALETTES[palette].dark : PALETTES[palette].light;
  // vars() cascades CSS variables to descendants so NativeWind classes
  // (`bg-primary`, `text-primary-text`, …) pick up the override at runtime.
  return vars({
    '--color-primary': c.primary,
    '--color-on-primary': c.onPrimary,
    '--color-secondary': c.primary,
    '--color-accent': c.primary,
    '--color-background': c.background,
    '--color-surface': c.surface,
    '--color-on-surface': c.onSurface,
    '--color-primary-text': c.primaryText,
    '--color-secondary-text': c.secondaryText,
    '--color-hint': c.hint,
    '--color-error': c.error,
    '--color-on-error': '#FFFFFF',
    '--color-success': c.success,
    '--color-divider': c.divider,
  });
}
