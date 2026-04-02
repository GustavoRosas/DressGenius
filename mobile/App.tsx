import './src/i18n'; // i18n must be imported before any component
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AuthProvider, PremiumProvider, ThemeProvider, NotificationProvider, useTheme } from './src/context';
import { RootNavigator } from './src/navigation';

function AppInner() {
  const { isDark, colors } = useTheme();

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      };

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <PremiumProvider>
            <AppInner />
          </PremiumProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
