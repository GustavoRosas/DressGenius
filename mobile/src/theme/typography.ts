/**
 * DressGenius — Typography Scale
 *
 * System fonts (San Francisco / Roboto) — sem dependência externa.
 * Escala modular para hierarquia visual clara.
 */

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'button'
  | 'overline';

export type TypographyScale = Record<TypographyVariant, TextStyle>;

export const typography: TypographyScale = {
  h1: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0,
  },
  subtitle1: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: 0.15,
  },
  subtitle2: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  body1: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.25,
  },
  body2: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0.25,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.5,
    textTransform: 'none',
  },
  overline: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
};
