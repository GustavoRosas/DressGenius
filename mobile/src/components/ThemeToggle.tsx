/**
 * DressGenius — Theme Toggle Component
 *
 * Simple sun/moon toggle that reads and toggles dark mode via useTheme().
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      hitSlop={8}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: isDark ? colors.primary : colors.border },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.surface,
              transform: [{ translateX: isDark ? 22 : 2 }],
            },
          ]}
        >
          <Text style={styles.icon}>{isDark ? '🌙' : '🌞'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
  },
});
