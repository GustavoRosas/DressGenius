/**
 * DressGenius — Social Auth Buttons
 *
 * Reusable component with Google + Apple sign-in buttons.
 * Apple button only shows on iOS.
 * Includes "or" divider.
 */

import React, { useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleAuthConfigured,
} from '../config/auth';

WebBrowser.maybeCompleteAuthSession();

interface SocialAuthButtonsProps {
  /** Shown above or below the form — includes the "or" divider */
  showDivider?: boolean;
  /** Position of divider relative to buttons: 'top' or 'bottom' */
  dividerPosition?: 'top' | 'bottom';
}

export function SocialAuthButtons({
  showDivider = true,
  dividerPosition = 'top',
}: SocialAuthButtonsProps) {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Google Auth Request
  const [_request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
  });

  // Handle Google response
  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken =
        response.authentication?.idToken ?? response.params?.id_token;
      if (idToken) {
        handleSocialLogin('google', idToken);
      }
    }
  }, [response]);

  const handleSocialLogin = useCallback(
    async (provider: 'google' | 'apple', token: string) => {
      try {
        const { data } = await api.post('/auth/social', { provider, token });
        await signIn(data.token, data.user ?? null);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          Alert.alert(t('auth.socialComingSoon'));
        } else {
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            t('auth.errors.invalidCredentials');
          Alert.alert(msg);
        }
      }
    },
    [signIn, t],
  );

  const handleGooglePress = useCallback(async () => {
    if (!isGoogleAuthConfigured) {
      Alert.alert(t('auth.socialNotConfigured'));
      return;
    }
    await promptAsync();
  }, [promptAsync, t]);

  const handleApplePress = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        await handleSocialLogin('apple', credential.identityToken);
      }
    } catch (err: any) {
      // User cancelled — ERR_REQUEST_CANCELED is normal, don't alert
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('auth.errors.invalidCredentials'));
      }
    }
  }, [handleSocialLogin, t]);

  const s = React.useMemo(() => createStyles(colors), [colors]);

  const divider = showDivider ? <OrDivider colors={colors} /> : null;

  return (
    <View style={s.container}>
      {dividerPosition === 'top' && divider}

      {/* Apple — iOS only */}
      {Platform.OS === 'ios' && (
        <SocialButton
          label={t('auth.continueWithApple')}
          icon="🍎"
          variant="apple"
          onPress={handleApplePress}
          colors={colors}
        />
      )}

      {/* Google */}
      <SocialButton
        label={t('auth.continueWithGoogle')}
        icon="G"
        variant="google"
        onPress={handleGooglePress}
        colors={colors}
      />

      {dividerPosition === 'bottom' && divider}
    </View>
  );
}

// ─── OrDivider ───────────────────────────────────────────────────────

function OrDivider({ colors }: { colors: ColorScheme }) {
  const { t } = useTranslation();
  const s = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.dividerContainer}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{t('auth.orDivider')}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

// ─── SocialButton ────────────────────────────────────────────────────

interface SocialButtonProps {
  label: string;
  icon: string;
  variant: 'google' | 'apple';
  onPress: () => void;
  colors: ColorScheme;
}

function SocialButton({ label, icon, variant, onPress, colors }: SocialButtonProps) {
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

  const isApple = variant === 'apple';
  const s = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          s.socialButton,
          isApple ? s.appleButton : s.googleButton,
        ]}
      >
        <Text
          style={[
            s.socialIcon,
            isApple ? s.appleIcon : s.googleIcon,
          ]}
        >
          {icon}
        </Text>
        <Text
          style={[
            s.socialLabel,
            isApple ? s.appleLabel : s.googleLabel,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      gap: spacing.md,
    },

    // Divider
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.divider,
    },
    dividerText: {
      ...typography.body2,
      color: colors.textTertiary,
      marginHorizontal: spacing.lg,
    },

    // Shared social button
    socialButton: {
      height: 52,
      borderRadius: borderRadius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },

    // Apple variant — dark button
    appleButton: {
      backgroundColor: '#000000',
      ...shadows.sm,
    },
    appleIcon: {
      fontSize: 20,
      marginRight: spacing.sm,
    },
    appleLabel: {
      ...typography.button,
      color: '#FFFFFF',
    },

    // Google variant — uses theme surface instead of hardcoded white
    googleButton: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...shadows.sm,
    },
    googleIcon: {
      fontSize: 18,
      fontWeight: '700',
      color: '#4285F4',
      marginRight: spacing.sm,
    },
    googleLabel: {
      ...typography.button,
      color: colors.text,
    },

    socialIcon: {},
    socialLabel: {},
  });
