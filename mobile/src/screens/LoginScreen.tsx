/**
 * DressGenius — Login Screen
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
  title: 'DressGenius',
  tagline: 'Your style, reinvented by AI',
  brandEmoji: '👗',
  emailLabel: 'Email',
  emailPlaceholder: 'your@email.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  forgotPassword: 'Forgot password?',
  loginButton: 'Sign In',
  loginButtonLoading: 'Signing in…',
  noAccount: "Don't have an account? ",
  signUp: 'Sign Up',
  errorEmpty: 'Please fill in all fields.',
  errorGeneric: 'Unable to sign in. Check your credentials.',
  errorIcon: '⚠️',
  emailIcon: '✉️',
  passwordIcon: '🔒',
  eyeOpen: '👁️',
  eyeClosed: '🙈',
} as const;

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError(STRINGS.errorEmpty);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/login', { email: email.trim(), password });
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
              <Text style={styles.brandName}>{STRINGS.title}</Text>
              <Text style={styles.brandTagline}>{STRINGS.tagline}</Text>
            </View>

            {/* ── Error ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {STRINGS.errorIcon} {error}
                </Text>
              </View>
            ) : null}

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
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

            {/* ── Forgot password ── */}
            <Pressable
              onPress={() => {
                /* placeholder */
              }}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>{STRINGS.forgotPassword}</Text>
            </Pressable>

            {/* ── Login Button ── */}
            <Button
              title={loading ? STRINGS.loginButtonLoading : STRINGS.loginButton}
              variant="primary"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            {/* ── Social Login ── */}
            <SocialAuthButtons />

            {/* ── Register link ── */}
            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {STRINGS.noAccount}
                <Text style={styles.linkBold}>{STRINGS.signUp}</Text>
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
      marginBottom: spacing.xxxl - spacing.xs,
    },
    brandEmoji: {
      fontSize: 56,
      marginBottom: spacing.sm,
    },
    brandName: {
      ...typography.h1,
      fontSize: 34,
      fontWeight: '800',
      color: colors.primary,
    },
    brandTagline: {
      ...typography.body2,
      color: colors.textSecondary,
      marginTop: spacing.sm - spacing.xxs,
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

    // Forgot password
    forgotButton: {
      alignSelf: 'flex-end',
      marginBottom: spacing.xl + spacing.xs,
      marginTop: -(spacing.sm),
    },
    forgotText: {
      ...typography.body2,
      color: colors.primaryLight,
      fontWeight: '600',
    },

    // Login button
    loginButton: {
      ...shadows.lg,
      height: 56,
    },

    // Register link
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
