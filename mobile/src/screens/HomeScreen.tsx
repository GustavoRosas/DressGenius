import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { apiUrl, appEnv } from '../config/env';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DressGenius</Text>
      <Text style={styles.sub}>Environment: {appEnv}</Text>
      <Text style={styles.muted} numberOfLines={2}>
        API: {apiUrl || '(set EXPO_PUBLIC_API_URL)'}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  sub: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  muted: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
