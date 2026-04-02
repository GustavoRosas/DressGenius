/**
 * DressGenius — Register Screen
 *
 * Uses design system components (Button, Input),
 * theme tokens, and react-i18next for localization.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fade-in animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = (): string | null => {
    if (!name.trim()) return t('register.errors.nameRequired');
    if (!email.trim()) return t('auth.errors.fillAllFields');
    if (!EMAIL_REGEX.test(email.trim())) return t('auth.errors.emailInvalid');
    if (password.length < 8) return t('auth.errors.passwordTooShort');
    if (password !== passwordConfirmation) return t('auth.errors.passwordMismatch');
    return null;
  };

  const handleRegister = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      await signIn(data.token, data.user ?? null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        t('auth.errors.accountCreationFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Branding ── */}
            <View style={styles.brandingContainer}>
              <Text style={styles.brandEmoji}>✨</Text>
              <Text style={styles.brandTitle}>{t('register.title')}</Text>
              <Text style={styles.brandSubtitle}>{t('register.subtitle')}</Text>
            </View>

            {/* ── Error ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ⚠️ {error}
                </Text>
              </View>
            ) : null}

            {/* ── Name ── */}
            <Input
              label={t('register.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('register.namePlaceholder')}
              icon={<Text style={styles.inputIcon}>👤</Text>}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />

            {/* ── Email ── */}
            <Input
              label={t('register.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('register.emailPlaceholder')}
              icon={<Text style={styles.inputIcon}>✉️</Text>}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />

            {/* ── Password ── */}
            <View style={styles.passwordContainer}>
              <Input
                label={t('register.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('register.passwordPlaceholder')}
                icon={<Text style={styles.inputIcon}>🔒</Text>}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="next"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={spacing.md}
                accessibilityLabel="Toggle password visibility"
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </Pressable>
            </View>

            {/* ── Confirm Password ── */}
            <View style={styles.passwordContainer}>
              <Input
                label={t('register.confirmPassword')}
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder={t('register.confirmPasswordPlaceholder')}
                icon={<Text style={styles.inputIcon}>🔐</Text>}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Pressable
                onPress={() => setShowConfirm((v) => !v)}
                style={styles.eyeButton}
                hitSlop={spacing.md}
                accessibilityLabel="Toggle password confirmation visibility"
              >
                <Text style={styles.eyeIcon}>
                  {showConfirm ? '🙈' : '👁️'}
                </Text>
              </Pressable>
            </View>

            {/* ── Register Button ── */}
            <Button
              title={loading ? t('register.loading') : t('register.submit')}
              variant="primary"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            {/* ── Social Login ── */}
            <SocialAuthButtons />

            {/* ── Login link ── */}
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {t('register.hasAccount')}{' '}
                <Text style={styles.linkBold}>{t('register.signIn')}</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl + spacing.xs,
      paddingVertical: spacing.xxxl,
    },
    content: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },

    // Branding
    brandingContainer: {
      alignItems: 'center',
      marginBottom: spacing.xxl + spacing.xs,
    },
    brandEmoji: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    brandTitle: {
      ...typography.h2,
      fontWeight: '800',
      color: colors.text,
    },
    brandSubtitle: {
      ...typography.body2,
      color: colors.textSecondary,
      marginTop: spacing.sm - spacing.xxs,
      textAlign: 'center',
      letterSpacing: 0.2,
    },

    // Error
    errorBox: {
      backgroundColor: colors.errorBackground,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.xl - spacing.xs,
      borderWidth: 1,
      borderColor: colors.error,
    },
    errorText: {
      ...typography.body2,
      color: colors.error,
      lineHeight: 20,
    },

    // Input icon
    inputIcon: {
      fontSize: 18,
    },

    // Password field — eye toggle overlay
    passwordContainer: {
      position: 'relative',
    },
    eyeButton: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.xl + spacing.xs,
      height: 52,
      justifyContent: 'center',
      zIndex: 1,
    },
    eyeIcon: {
      fontSize: 20,
    },

    // Register button
    registerButton: {
      ...shadows.lg,
      height: 56,
      marginTop: spacing.md,
    },

    // Login link
    linkButton: {
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingVertical: spacing.sm,
    },
    linkText: {
      ...typography.body2,
      fontSize: 15,
      color: colors.textSecondary,
    },
    linkBold: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
