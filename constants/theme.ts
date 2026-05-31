export const LIGHT_COLORS = {
  primary: '#6C5CE7',
  onPrimary: '#FFFFFF',
  background: '#F8F9FC',
  surface: '#FFFFFF',
  onSurface: '#1C1C1E',
  primaryText: '#1C1C1E',
  secondaryText: '#636366',
  hint: '#C7C7CC',
  error: '#FF3B30',
  success: '#34C759',
  divider: '#E5E5EA',
} as const;

export const DARK_COLORS = {
  primary: '#6C5CE7',
  onPrimary: '#FFFFFF',
  background: '#000000',
  surface: '#1C1C1E',
  onSurface: '#F2F2F7',
  primaryText: '#FFFFFF',
  secondaryText: '#8E8E93',
  hint: '#48484A',
  error: '#FF453A',
  success: '#32D74B',
  divider: '#38383A',
} as const;

// ---------------------------------------------------------------------------
// TEMP palette — "Hype" (mauve/peach, warm-ivory base). Driven by the
// in-app palette switcher in Settings. Remove (or promote) once decided.
// ---------------------------------------------------------------------------
export const HYPE_LIGHT_COLORS = {
  primary: '#B582A3',        // mauve from logo (anchor accent)
  onPrimary: '#FFFFFF',
  background: '#FFF3EE',     // warm ivory from logo bg
  surface: '#FFFFFF',        // cards pop a touch lighter than bg
  onSurface: '#3D2A26',      // deep warm taupe for high-contrast surfaces
  primaryText: '#6E4C44',    // soft warm taupe — readable but matches vibe
  secondaryText: '#A97F78',  // the wordmark color from the logo
  hint: '#B58E86',           // the tagline color from the logo
  error: '#D87262',          // warm coral-red (fits the warm family)
  success: '#8FB890',        // warm sage green
  divider: '#F0DDD4',        // very soft warm tint
} as const;

export const HYPE_DARK_COLORS = {
  primary: '#C195B3',        // slightly brighter mauve for dark visibility
  onPrimary: '#FFFFFF',
  background: '#1F1714',     // deep warm brown
  surface: '#2C2320',
  onSurface: '#F5E6DD',
  primaryText: '#F5E6DD',    // warm cream
  secondaryText: '#C9A39C',
  hint: '#8A7468',
  error: '#E08877',
  success: '#9BC798',
  divider: '#3D2E28',
} as const;

// ---------------------------------------------------------------------------
// "Sage & Cream" — gender-neutral, growth-coded earth-tone palette. Sage
// green primary, warm cream background. Good fit for a habit/growth app
// without leaning masculine or feminine.
// ---------------------------------------------------------------------------
export const SAGE_LIGHT_COLORS = {
  primary: '#6B8E72',        // muted sage green (growth, calm)
  onPrimary: '#FFFFFF',
  background: '#F5F2EB',     // warm cream
  surface: '#FFFFFF',        // cards pop above the cream
  onSurface: '#2C3530',      // warm charcoal
  primaryText: '#2C3530',
  secondaryText: '#6B7670',  // muted warm gray-green
  hint: '#9BA39E',
  error: '#C76555',          // warm coral — fits the warm family
  success: '#4F9B61',        // slightly punchier green so "done" reads distinct
  divider: '#E2DFD6',        // soft warm tint
} as const;

export const SAGE_DARK_COLORS = {
  primary: '#8FB397',        // brighter sage for dark visibility
  onPrimary: '#1F2522',
  background: '#1F2522',     // deep warm charcoal-green
  surface: '#2A322C',
  onSurface: '#E8E4DA',
  primaryText: '#E8E4DA',    // warm cream
  secondaryText: '#A0A89F',
  hint: '#6E7670',
  error: '#D87262',
  success: '#6FB382',
  divider: '#3A4239',
} as const;

export type ThemeColors = { readonly [K in keyof typeof LIGHT_COLORS]: string };

export interface ThemeFonts {
  primary: string;
  primarySemibold: string;
  primaryBold: string;
  secondary: string;
  secondarySemibold: string;
}

export const DEFAULT_FONTS: ThemeFonts = {
  primary: 'PlusJakartaSans-Regular',
  primarySemibold: 'PlusJakartaSans-SemiBold',
  primaryBold: 'PlusJakartaSans-Bold',
  secondary: 'Inter-Regular',
  secondarySemibold: 'Inter-SemiBold',
};

// Avenir Next — iOS system font (no bundling needed). On Android these
// PostScript names won't resolve and RN falls back to the platform default.
// If Hype ships permanently and Android is in scope, bundle the .ttfs.
export const HYPE_FONTS: ThemeFonts = {
  primary: 'AvenirNext-Regular',
  primarySemibold: 'AvenirNext-DemiBold',
  primaryBold: 'AvenirNext-Bold',
  secondary: 'AvenirNext-Regular',
  secondarySemibold: 'AvenirNext-Medium',
};

export type PaletteId = 'default' | 'hype' | 'sage';

export const PALETTES: Record<
  PaletteId,
  { label: string; light: ThemeColors; dark: ThemeColors; fonts: ThemeFonts }
> = {
  default: {
    label: 'Default (Indigo)',
    light: LIGHT_COLORS,
    dark: DARK_COLORS,
    fonts: DEFAULT_FONTS,
  },
  hype: {
    label: 'Hype (Mauve)',
    light: HYPE_LIGHT_COLORS,
    dark: HYPE_DARK_COLORS,
    fonts: HYPE_FONTS,
  },
  sage: {
    label: 'Sage & Cream',
    light: SAGE_LIGHT_COLORS,
    dark: SAGE_DARK_COLORS,
    fonts: DEFAULT_FONTS,
  },
};

/** @deprecated import `useThemeColors` from `lib/theme-context` instead. */
export const COLORS = LIGHT_COLORS;
