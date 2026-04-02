/**
 * DressGenius — Shadow Styles
 *
 * Cross-platform: shadowProps (iOS) + elevation (Android).
 */

import { Platform, ViewStyle } from 'react-native';

export interface ShadowStyle extends ViewStyle {}

const createShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ShadowStyle =>
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  }) as ShadowStyle;

export const shadows = {
  /** Sem sombra */
  none: createShadow(0, 0, 0, 0),
  /** Cards sutis, inputs */
  sm: createShadow(1, 3, 0.08, 2),
  /** Cards padrão */
  md: createShadow(2, 6, 0.12, 4),
  /** Botões elevados, modais */
  lg: createShadow(4, 12, 0.16, 8),
  /** FAB, bottom sheets */
  xl: createShadow(8, 24, 0.2, 16),
} as const;

export type ShadowKey = keyof typeof shadows;
