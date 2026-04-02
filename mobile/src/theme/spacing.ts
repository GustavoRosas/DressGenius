/**
 * DressGenius — Spacing Scale
 *
 * Base 4px — consistente e previsível.
 */

export const spacing = {
  /** 2px */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 24px */
  xl: 24,
  /** 32px */
  xxl: 32,
  /** 48px */
  xxxl: 48,
} as const;

export const borderRadius = {
  /** 4px — pills, tags */
  xs: 4,
  /** 8px — small elements */
  sm: 8,
  /** 12px — inputs, cards internos */
  md: 12,
  /** 16px — cards */
  lg: 16,
  /** 24px — botões */
  xl: 24,
  /** 28px — botões grandes, FABs */
  xxl: 28,
  /** Full round */
  full: 9999,
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
