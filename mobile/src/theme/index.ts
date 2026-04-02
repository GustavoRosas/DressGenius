/**
 * DressGenius — Theme (centralized export)
 *
 * Usage:
 *   import { theme, lightColors, darkColors } from '@/theme';
 *   // or
 *   import { theme } from '../theme';
 */

export { palette, lightColors, darkColors } from './colors';
export type { ColorScheme } from './colors';

export { typography } from './typography';
export type { TypographyVariant, TypographyScale } from './typography';

export { spacing, borderRadius } from './spacing';
export type { SpacingKey, BorderRadiusKey } from './spacing';

export { shadows } from './shadows';
export type { ShadowKey, ShadowStyle } from './shadows';

// Convenience: default theme object
import { lightColors, darkColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export const darkTheme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
