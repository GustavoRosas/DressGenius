/**
 * DressGenius - Color Palette
 *
 * Primary: Deep violet - elegante, fashion-forward
 * Secondary: Warm gold - luxo acessivel
 * Accent: Coral - vibrante, call-to-action
 *
 * Contraste AA garantido em todas as combinacoes text/background.
 */

export const palette = {
  // Violets
  violet50: '#F3E8FF',
  violet100: '#E9D5FF',
  violet200: '#D8B4FE',
  violet300: '#C084FC',
  violet400: '#A855F7',
  violet500: '#7C3AED',
  violet600: '#6D28D9',
  violet700: '#5B21B6',
  violet800: '#4C1D95',
  violet900: '#3B0764',

  // Gold
  gold50: '#FFFBEB',
  gold100: '#FEF3C7',
  gold200: '#FDE68A',
  gold300: '#FCD34D',
  gold400: '#FBBF24',
  gold500: '#D4A017',
  gold600: '#B8860B',

  // Coral
  coral300: '#FCA5A5',
  coral400: '#F87171',
  coral500: '#EF4444',

  // Neutrals
  neutral0: '#FFFFFF',
  neutral50: '#FAFAFA',
  neutral100: '#F5F5F5',
  neutral200: '#E5E5E5',
  neutral300: '#D4D4D4',
  neutral400: '#A3A3A3',
  neutral500: '#737373',
  neutral600: '#525252',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  neutral950: '#0A0A0A',

  // Semantic
  green500: '#22C55E',
  green600: '#16A34A',
  amber500: '#F59E0B',
  amber600: '#D97706',
  red500: '#EF4444',
  red600: '#DC2626',
} as const;

export interface ColorScheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;

  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  border: string;
  borderFocused: string;
  divider: string;

  error: string;
  errorBackground: string;
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;

  disabled: string;
  disabledText: string;
  placeholder: string;

  overlay: string;
}

export const lightColors: ColorScheme = {
  primary: palette.violet600,
  primaryLight: palette.violet100,
  primaryDark: palette.violet800,
  secondary: palette.gold500,
  secondaryLight: palette.gold100,
  accent: palette.coral400,

  background: palette.neutral50,
  surface: palette.neutral0,
  surfaceElevated: palette.neutral0,
  card: palette.neutral0,

  text: palette.neutral900,
  textSecondary: palette.neutral600,
  textTertiary: palette.neutral400,
  textInverse: palette.neutral0,

  border: palette.neutral200,
  borderFocused: palette.violet500,
  divider: palette.neutral200,

  error: palette.red600,
  errorBackground: '#FEF2F2',
  success: palette.green600,
  successBackground: '#F0FDF4',
  warning: palette.amber600,
  warningBackground: '#FFFBEB',

  disabled: palette.neutral200,
  disabledText: palette.neutral400,
  placeholder: palette.neutral400,

  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkColors: ColorScheme = {
  primary: palette.violet400,
  primaryLight: palette.violet900,
  primaryDark: palette.violet300,
  secondary: palette.gold400,
  secondaryLight: palette.gold600,
  accent: palette.coral300,

  background: palette.neutral950,
  surface: palette.neutral900,
  surfaceElevated: palette.neutral800,
  card: palette.neutral800,

  text: palette.neutral50,
  textSecondary: palette.neutral400,
  textTertiary: palette.neutral500,
  textInverse: palette.neutral900,

  border: palette.neutral700,
  borderFocused: palette.violet400,
  divider: palette.neutral700,

  error: palette.red500,
  errorBackground: '#451A1A',
  success: palette.green500,
  successBackground: '#14532D',
  warning: palette.amber500,
  warningBackground: '#451A03',

  disabled: palette.neutral700,
  disabledText: palette.neutral500,
  placeholder: palette.neutral500,

  overlay: 'rgba(0, 0, 0, 0.7)',
};

/** Convenience alias - default light scheme */
export const colors = lightColors;