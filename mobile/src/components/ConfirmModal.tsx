/**
 * DressGenius — Custom Confirmation Modal
 * Replaces ugly native Alert.alert for destructive confirmations.
 */

import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

interface ConfirmModalProps {
  visible: boolean;
  emoji?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 'danger' for red confirm button, 'primary' for violet */
  variant?: 'danger' | 'primary';
}

export function ConfirmModal({
  visible,
  emoji,
  title,
  message,
  confirmLabel: confirmLabelProp,
  cancelLabel: cancelLabelProp,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const confirmLabel = confirmLabelProp || t('common.confirm');
  const cancelLabel = cancelLabelProp || t('common.cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Button
              title={cancelLabel}
              variant="outline"
              onPress={onCancel}
              style={styles.button}
              textStyle={{ color: colors.primary }}
            />
            <Button
              title={confirmLabel}
              variant="primary"
              onPress={onConfirm}
              style={variant === 'danger' ? StyleSheet.flatten([styles.button, styles.dangerButton]) : styles.button}
              textStyle={{ color: '#FFFFFF' }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      ...shadows.lg,
    },
    emoji: {
      fontSize: 40,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    message: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 22,
    },
    buttons: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%',
    },
    button: {
      flex: 1,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
  });
}
