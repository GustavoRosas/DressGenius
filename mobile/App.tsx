import './src/i18n'; // i18n must be imported before any component
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, PremiumProvider } from './src/context';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </PremiumProvider>
    </AuthProvider>
  );
}
