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

export type ThemeColors = { readonly [K in keyof typeof LIGHT_COLORS]: string };

/** @deprecated import `useThemeColors` from `lib/theme-context` instead. */
export const COLORS = LIGHT_COLORS;
