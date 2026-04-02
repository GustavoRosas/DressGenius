/**
 * DressGenius — Button Component
 *
 * Variantes: primary | secondary | outline | ghost
 * Animated scale-down no press, loading spinner, disabled state.
 * Sem dependências externas — usa apenas React Native core.
 */

import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const isDisabled = disabled || loading;

  const containerStyles = getContainerStyle(variant, isDisabled);
  const labelStyle = getLabelStyle(variant, isDisabled);
  const spinnerColor = getSpinnerColor(variant);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityLabel={title}
        style={[styles.base, containerStyles, style]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <Text style={[styles.label, labelStyle, textStyle]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

// — Style helpers —

function getContainerStyle(variant: ButtonVariant, disabled: boolean): ViewStyle {
  if (disabled) {
    return variant === 'outline' || variant === 'ghost'
      ? { backgroundColor: 'transparent', borderColor: colors.disabled, borderWidth: 1.5 }
      : { backgroundColor: colors.disabled };
  }

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.primary,
        ...shadows.md,
      };
    case 'secondary':
      return {
        backgroundColor: colors.secondary,
        ...shadows.sm,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderColor: colors.primary,
        borderWidth: 1.5,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
      };
  }
}

function getLabelStyle(variant: ButtonVariant, disabled: boolean): TextStyle {
  if (disabled) {
    return { color: colors.disabledText };
  }

  switch (variant) {
    case 'primary':
      return { color: colors.textInverse };
    case 'secondary':
      return { color: colors.textInverse };
    case 'outline':
      return { color: colors.primary };
    case 'ghost':
      return { color: colors.primary };
  }
}

function getSpinnerColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
    case 'secondary':
      return colors.textInverse;
    case 'outline':
    case 'ghost':
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 120,
  },
  label: {
    ...typography.button,
  },
});
