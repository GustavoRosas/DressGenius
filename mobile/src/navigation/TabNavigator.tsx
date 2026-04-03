import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { AnalyzeScreen, HistoryScreen, AnalyticsScreen, ClosetScreen, ProfileScreen } from '../screens';
import { useTheme } from '../context/ThemeContext';
import type { TabParamList } from './types';
import type { ColorScheme } from '../theme/colors';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Analyze: '🔍',
  History: '📜',
  Analytics: '📊',
  Closet: '👔',
  Profile: '👤',
};

export function TabNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

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
        name="Analyze"
        component={AnalyzeScreen}
        options={{ tabBarLabel: t('tabs.analyze') }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: t('tabs.history') }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarLabel: t('tabs.analytics') }}
      />
      <Tab.Screen
        name="Closet"
        component={ClosetScreen}
        options={{ tabBarLabel: t('tabs.closet') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}

const createDynamicStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: 60,
      paddingBottom: 6,
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
