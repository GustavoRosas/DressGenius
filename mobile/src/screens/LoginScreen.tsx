/**
 * DressGenius — Login Screen
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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

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
      setError(t('auth.errors.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/login', { email: email.trim(), password });
      await signIn(data.token, data.user ?? null);
    } catch (err: any) {
      const { extractApiError } = require('../api/translateApiError');
      setError(extractApiError(err, 'auth.errors.invalidCredentials'));
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
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
              <Text style={styles.brandEmoji}>👗</Text>
              <Text style={styles.brandName}>{t('app.name')}</Text>
              <Text style={styles.brandTagline}>{t('app.tagline')}</Text>
            </View>

            {/* ── Error ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ⚠️ {error}
                </Text>
              </View>
            ) : null}

            {/* ── Email ── */}
            <Input
              label={t('login.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPlaceholder')}
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
                label={t('login.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder')}
                icon={<Text style={styles.inputIcon}>🔒</Text>}
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
                  {showPassword ? '🙈' : '👁️'}
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
              <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
            </Pressable>

            {/* ── Login Button ── */}
            <Button
              title={loading ? t('login.loading') : t('login.submit')}
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
                {t('login.noAccount')}{' '}
                <Text style={styles.linkBold}>{t('login.signUp')}</Text>
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

    // Forgot password — Fix 5: uses colors.primary for proper contrast
    forgotButton: {
      alignSelf: 'flex-end',
      marginBottom: spacing.xl + spacing.xs,
      marginTop: -(spacing.sm),
    },
    forgotText: {
      ...typography.body2,
      color: colors.primary,
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
