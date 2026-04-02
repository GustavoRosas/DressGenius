/**
 * DressGenius — Input Component
 *
 * Label acima do campo, ícone opcional à esquerda, estado de erro.
 * Animated border color on focus. Sem dependências externas.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { lightColors as colors } from '../theme/colors';
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
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  icon,
  containerStyle,
  ...rest
}) => {
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
    ? colors.error
    : borderColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.borderFocused],
      });

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <Text
        style={[
          styles.label,
          isFocused && !error && styles.labelFocused,
          !!error && styles.labelError,
        ]}
      >
        {label}
      </Text>

      {/* Field wrapper */}
      <Animated.View
        style={[
          styles.fieldWrapper,
          { borderColor },
          isFocused && !error && shadows.sm,
        ]}
      >
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          accessibilityState={{ disabled: rest.editable === false }}
          style={[styles.input, icon ? styles.inputWithIcon : undefined]}
          {...rest}
        />
      </Animated.View>

      {/* Error message */}
      {!!error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  labelFocused: {
    color: colors.primary,
  },
  labelError: {
    color: colors.error,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    color: colors.text,
    padding: 0,
    height: '100%',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
