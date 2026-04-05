/**
 * DressGenius — Bug Report FAB
 *
 * Floating action button for beta feedback. Shows a bottom sheet
 * with type selector, description, severity, and screenshot option.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

type ReportType = 'bug' | 'suggestion' | 'question';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const TYPES: { key: ReportType; emoji: string; labelKey: string }[] = [
  { key: 'bug', emoji: '🐛', labelKey: 'feedback.type.bug' },
  { key: 'suggestion', emoji: '💡', labelKey: 'feedback.type.suggestion' },
  { key: 'question', emoji: '❓', labelKey: 'feedback.type.question' },
];

const SEVERITIES: { key: Severity; labelKey: string }[] = [
  { key: 'critical', labelKey: 'feedback.severity.critical' },
  { key: 'high', labelKey: 'feedback.severity.high' },
  { key: 'medium', labelKey: 'feedback.severity.medium' },
  { key: 'low', labelKey: 'feedback.severity.low' },
];

export function BugReportFAB() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ReportType>('bug');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setType('bug');
    setDescription('');
    setSeverity('medium');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const context = {
        app_version: Constants.expoConfig?.version ?? '1.0.0',
        device_model: Device.modelName ?? 'unknown',
        os_name: Platform.OS,
        os_version: Platform.Version?.toString() ?? 'unknown',
      };

      await api.post('/feedback-reports', {
        type,
        description: description.trim(),
        severity: type === 'bug' ? severity : undefined,
        app_version: context.app_version,
        device_model: context.device_model,
        os_name: context.os_name,
        os_version: context.os_version,
      });

      showToast(t('feedback.sent'), 'success');
      setVisible(false);
      reset();
    } catch {
      showToast(t('feedback.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [type, description, severity, t, showToast, reset]);

  return (
    <>
      {/* FAB Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.fabIcon}>🐛</Text>
      </Pressable>

      {/* Report Modal */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View />
        </Pressable>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('feedback.title')}</Text>

            {/* Type Selector */}
            <View style={styles.typeRow}>
              {TYPES.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.typeChip, type === item.key && styles.typeChipActive]}
                  onPress={() => setType(item.key)}
                >
                  <Text style={styles.typeEmoji}>{item.emoji}</Text>
                  <Text style={[styles.typeLabel, type === item.key && styles.typeLabelActive]}>
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Description */}
            <TextInput
              style={styles.input}
              placeholder={t('feedback.descriptionPlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={5000}
              textAlignVertical="top"
            />

            {/* Severity (bug only) */}
            {type === 'bug' && (
              <>
                <Text style={styles.sectionLabel}>{t('feedback.severityLabel')}</Text>
                <View style={styles.severityRow}>
                  {SEVERITIES.map((s) => (
                    <Pressable
                      key={s.key}
                      style={[styles.severityChip, severity === s.key && styles.severityChipActive]}
                      onPress={() => setSeverity(s.key)}
                    >
                      <Text style={[styles.severityText, severity === s.key && styles.severityTextActive]}>
                        {t(s.labelKey)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Submit */}
            <Pressable
              style={[styles.submitButton, (!description.trim() || submitting) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!description.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t('feedback.submit')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 90,
      right: 20,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
      zIndex: 999,
    },
    fabIcon: { fontSize: 24 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxxl,
      maxHeight: '75%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    typeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    typeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    typeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    typeEmoji: { fontSize: 16 },
    typeLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    typeLabelActive: { color: colors.primary },
    input: {
      ...typography.body1,
      color: colors.text,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      ...typography.subtitle2,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    severityRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    severityChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    severityChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    severityText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    severityTextActive: { color: colors.primary },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      ...shadows.md,
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { ...typography.subtitle1, color: '#fff', fontWeight: '700' },
  });
