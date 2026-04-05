import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>🐛 DressGenius Crashed</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.error}>{this.state.error?.message}</Text>
            <Text style={styles.stack}>{this.state.error?.stack?.substring(0, 2000)}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0533', padding: 20, paddingTop: 60 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  scroll: { flex: 1 },
  error: { color: '#F87171', fontSize: 16, marginBottom: 12 },
  stack: { color: '#aaa', fontSize: 11, fontFamily: 'monospace' },
});
