/**
 * DressGenius — Input Component
 *
 * Label acima do campo, ícone opcional à esquerda, estado de erro.
 * Animated border color on focus. Sem dependências externas.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  /** React element rendered inside the field, left side */
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
  /** Override theme colors (falls back to ThemeContext) */
  colors?: ColorScheme;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  icon,
  containerStyle,
  colors: colorsProp,
  ...rest
}) => {
  const themeColors = useTheme().colors;
  const c = colorsProp ?? themeColors;

  const [isFocused, setIsFocused] = useState(false);
  const borderColorAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(borderColorAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [borderColorAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(borderColorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [borderColorAnim]);

  const borderColor = error
    ? c.error
    : borderColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [c.border, c.borderFocused],
      });

  const dynamicStyles = useMemo(() => createStyles(c), [c]);

  return (
    <View style={[dynamicStyles.container, containerStyle]}>
      {/* Label */}
      <Text
        style={[
          dynamicStyles.label,
          isFocused && !error && dynamicStyles.labelFocused,
          !!error && dynamicStyles.labelError,
        ]}
      >
        {label}
      </Text>

      {/* Field wrapper */}
      <Animated.View
        style={[
          dynamicStyles.fieldWrapper,
          { borderColor },
          isFocused && !error && shadows.sm,
        ]}
      >
        {icon && <View style={dynamicStyles.iconWrapper}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={c.placeholder}
          selectionColor={c.primary}
          accessibilityLabel={label}
          accessibilityState={{ disabled: rest.editable === false }}
          style={[dynamicStyles.input, icon ? dynamicStyles.inputWithIcon : undefined]}
          {...rest}
        />
      </Animated.View>

      {/* Error message */}
      {!!error && (
        <Text style={dynamicStyles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

const createStyles = (c: ColorScheme) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '600',
    },
    labelFocused: {
      color: c.primary,
    },
    labelError: {
      color: c.error,
    },
    fieldWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.lg,
      height: 52,
    },
    iconWrapper: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      ...typography.body1,
      color: c.text,
      padding: 0,
      height: '100%',
    },
    inputWithIcon: {
      paddingLeft: 0,
    },
    errorText: {
      ...typography.caption,
      color: c.error,
      marginTop: spacing.xs,
    },
  });
