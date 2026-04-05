/**
 * DressGenius — LockedSection
 *
 * Wraps premium content with overlay + lock icon when user is on free plan.
 * Tap opens upgrade flow.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import type { ColorScheme } from '../theme/colors';

interface LockedSectionProps {
  locked: boolean;
  children: React.ReactNode;
  title?: string;
  onUpgrade: () => void;
}

export function LockedSection({ locked, children, title, onUpgrade }: LockedSectionProps) {
  const { colors } = useTheme();

  if (!locked) return <>{children}</>;

  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      {/* Dimmed content */}
      <View style={styles.content} pointerEvents="none">
        <View style={styles.dimmed}>{children}</View>
      </View>

      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onUpgrade}>
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
          {title ? <Text style={styles.ctaText}>{title}</Text> : null}
          <Text style={styles.upgradeText}>Premium</Text>
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xl,
    },
    content: {
      opacity: 0.2,
    },
    dimmed: {},
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: '#C9A84C40',
    },
    lockBadge: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    lockIcon: {
      fontSize: 32,
      marginBottom: spacing.sm,
    },
    ctaText: {
      ...typography.body2,
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    upgradeText: {
      ...typography.subtitle2,
      color: '#C9A84C',
      fontWeight: '700',
    },
  });
