import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LoginScreen,
  RegisterScreen,
  OnboardingScreen,
  ChatScreen,
  PaywallScreen,
  AIPreferencesScreen,
  NotificationPrefsScreen,
  MonthlyReportScreen,
  ScanDetailScreen,
  HistoryScreen,
  AnalyticsScreen,
  MyPlanScreen,
} from '../screens';
import { TabNavigator } from './TabNavigator';
import { ONBOARDING_KEY } from '../screens/OnboardingScreen';
import { colors as defaultColors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Universal ← back button for stack screens */
function BackButton({ onPress, tintColor }: { onPress: () => void; tintColor: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ padding: 4 }}>
      <Text style={{ fontSize: 24, color: tintColor, lineHeight: 28 }}>←</Text>
    </Pressable>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
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
        <ActivityIndicator size="large" color={defaultColors.primary} />
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
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_bottom',
              presentation: 'modal',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="AIPreferences"
            component={AIPreferencesScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="NotificationPrefs"
            component={NotificationPrefsScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="MonthlyReport"
            component={MonthlyReportScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="ScanDetail"
            component={ScanDetailScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
          />
          <Stack.Screen
            name="MyPlan"
            component={MyPlanScreen}
            options={({ navigation }) => ({
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitle: '',
              headerLeft: () => (
                <BackButton onPress={() => navigation.goBack()} tintColor={colors.text} />
              ),
            })}
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
    backgroundColor: defaultColors.background,
  },
});
