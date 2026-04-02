/**
 * DressGenius — Register Screen
 *
 * Refactored to use design system components (Button, Input),
 * theme tokens, and i18n-ready STRINGS constant.
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

// ─── i18n-ready strings ─────────────────────────────────────────────
const STRINGS = {
  brandEmoji: '✨',
  title: 'Create your account',
  subtitle: 'Start your style journey with DressGenius',
  nameLabel: 'Name',
  namePlaceholder: 'Your full name',
  emailLabel: 'Email',
  emailPlaceholder: 'your@email.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Min. 8 characters',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Repeat your password',
  registerButton: 'Create Account',
  registerButtonLoading: 'Creating account…',
  hasAccount: 'Already have an account? ',
  signIn: 'Sign In',
  errorName: 'Please enter your name.',
  errorEmail: 'Please enter your email.',
  errorEmailInvalid: 'Invalid email address.',
  errorPasswordLength: 'Password must be at least 8 characters.',
  errorPasswordMatch: 'Passwords do not match.',
  errorGeneric: 'Unable to create account. Please try again.',
  errorIcon: '⚠️',
  nameIcon: '👤',
  emailIcon: '✉️',
  passwordIcon: '🔒',
  confirmIcon: '🔐',
  eyeOpen: '👁️',
  eyeClosed: '🙈',
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();

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
    if (!name.trim()) return STRINGS.errorName;
    if (!email.trim()) return STRINGS.errorEmail;
    if (!EMAIL_REGEX.test(email.trim())) return STRINGS.errorEmailInvalid;
    if (password.length < 8) return STRINGS.errorPasswordLength;
    if (password !== passwordConfirmation) return STRINGS.errorPasswordMatch;
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
        STRINGS.errorGeneric;
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
              <Text style={styles.brandEmoji}>{STRINGS.brandEmoji}</Text>
              <Text style={styles.brandTitle}>{STRINGS.title}</Text>
              <Text style={styles.brandSubtitle}>{STRINGS.subtitle}</Text>
            </View>

            {/* ── Error ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {STRINGS.errorIcon} {error}
                </Text>
              </View>
            ) : null}

            {/* ── Name ── */}
            <Input
              label={STRINGS.nameLabel}
              value={name}
              onChangeText={setName}
              placeholder={STRINGS.namePlaceholder}
              icon={<Text style={styles.inputIcon}>{STRINGS.nameIcon}</Text>}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />

            {/* ── Email ── */}
            <Input
              label={STRINGS.emailLabel}
              value={email}
              onChangeText={setEmail}
              placeholder={STRINGS.emailPlaceholder}
              icon={<Text style={styles.inputIcon}>{STRINGS.emailIcon}</Text>}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />

            {/* ── Password ── */}
            <View style={styles.passwordContainer}>
              <Input
                label={STRINGS.passwordLabel}
                value={password}
                onChangeText={setPassword}
                placeholder={STRINGS.passwordPlaceholder}
                icon={<Text style={styles.inputIcon}>{STRINGS.passwordIcon}</Text>}
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
                  {showPassword ? STRINGS.eyeClosed : STRINGS.eyeOpen}
                </Text>
              </Pressable>
            </View>

            {/* ── Confirm Password ── */}
            <View style={styles.passwordContainer}>
              <Input
                label={STRINGS.confirmPasswordLabel}
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder={STRINGS.confirmPasswordPlaceholder}
                icon={<Text style={styles.inputIcon}>{STRINGS.confirmIcon}</Text>}
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
                  {showConfirm ? STRINGS.eyeClosed : STRINGS.eyeOpen}
                </Text>
              </Pressable>
            </View>

            {/* ── Register Button ── */}
            <Button
              title={loading ? STRINGS.registerButtonLoading : STRINGS.registerButton}
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
                {STRINGS.hasAccount}
                <Text style={styles.linkBold}>{STRINGS.signIn}</Text>
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
