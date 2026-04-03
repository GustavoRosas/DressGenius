import React, { useMemo, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { HomeScreen } from '../screens/HomeScreen';
import { ClosetScreen } from '../screens/ClosetScreen';
import { AnalyzeScreen } from '../screens/AnalyzeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../context/ThemeContext';
import type { TabParamList } from './types';
import type { ColorScheme } from '../theme/colors';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Home: '🏠',
  Closet: '👗',
  Analyze: '📸',
  Settings: '⚙️',
  Profile: '👤',
};

/** Elevated FAB button for the center Analyze tab */
function AnalyzeFAB({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: ColorScheme;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel="Analyze"
    >
      <Animated.View
        style={[
          fabStyles.container,
          {
            backgroundColor: colors.primary,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={fabStyles.icon}>📸</Text>
      </Animated.View>
    </Pressable>
  );
}

const fabStyles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  icon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
});

export function TabNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dynamicStyles = useMemo(
    () => createDynamicStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.icon, focused && styles.iconFocused]}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: dynamicStyles.tabBar,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t('tabs.home') }}
      />
      <Tab.Screen
        name="Closet"
        component={ClosetScreen}
        options={{ tabBarLabel: t('tabs.closet') }}
      />
      <Tab.Screen
        name="Analyze"
        component={AnalyzeScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <AnalyzeFAB
              onPress={() => props.onPress?.({} as any)}
              colors={colors}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: t('tabs.settings') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}

const createDynamicStyles = (colors: ColorScheme, safeBottom: number) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: 60 + safeBottom,
      paddingBottom: safeBottom > 0 ? safeBottom : 6,
      paddingTop: 4,
    },
  });

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  icon: {
    fontSize: 22,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});
