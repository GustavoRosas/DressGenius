/**
 * DressGenius — Toast / Snackbar Component
 *
 * Elegant non-blocking notification that appears at the top of the screen.
 * Slide-down + fade-in animation, auto-dismiss, tap to dismiss.
 * Dark mode aware via useTheme().
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastProps extends ToastConfig {
  onDismiss: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export function Toast({ message, type, duration, onDismiss }: ToastProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorMap: Record<ToastType, { bg: string; text: string; icon: string }> = {
    success: {
      bg: isDark ? '#0C3D20' : '#ECFDF5',
      text: isDark ? '#86EFAC' : '#065F46',
      icon: isDark ? '#4ADE80' : '#16A34A',
    },
    error: {
      bg: isDark ? '#451A1A' : '#FEF2F2',
      text: isDark ? '#FCA5A5' : '#991B1B',
      icon: isDark ? '#F87171' : '#DC2626',
    },
    info: {
      bg: isDark ? '#1E3A5F' : '#EFF6FF',
      text: isDark ? '#93C5FD' : '#1E40AF',
      icon: isDark ? '#60A5FA' : '#2563EB',
    },
    warning: {
      bg: isDark ? '#451A03' : '#FFFBEB',
      text: isDark ? '#FCD34D' : '#92400E',
      icon: isDark ? '#FBBF24' : '#D97706',
    },
  };

  const scheme = colorMap[type];

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [translateY, opacity, onDismiss]);

  useEffect(() => {
    animateIn();
    dismissTimer.current = setTimeout(() => {
      animateOut();
    }, duration);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [animateIn, animateOut, duration]);

  const handlePress = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    animateOut();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[
          styles.container,
          {
            backgroundColor: scheme.bg,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            shadowColor: isDark ? '#000' : '#888',
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: scheme.icon + '20' }]}>
          <Text style={[styles.icon, { color: scheme.icon }]}>
            {ICONS[type]}
          </Text>
        </View>
        <Text
          style={[styles.message, { color: scheme.text }]}
          numberOfLines={2}
        >
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
