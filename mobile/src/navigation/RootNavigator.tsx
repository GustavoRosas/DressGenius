import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { LoginScreen, RegisterScreen, OnboardingScreen, ChatScreen, PaywallScreen, AIPreferencesScreen, NotificationPrefsScreen, MonthlyReportScreen } from '../screens';
import { TabNavigator } from './TabNavigator';
import { ONBOARDING_KEY } from '../screens/OnboardingScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
        setOnboardingDone(value === 'true');
      } catch {
        setOnboardingDone(false);
      }
    })();
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingDone && (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Home" component={TabNavigator} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="AIPreferences"
            component={AIPreferencesScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="NotificationPrefs"
            component={NotificationPrefsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MonthlyReport"
            component={MonthlyReportScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
