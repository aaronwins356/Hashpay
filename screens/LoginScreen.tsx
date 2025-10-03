import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { layout, typography } from '../theme/styles';

const LoginScreen: React.FC = () => (
  <SafeAreaView style={[layout.screen, styles.container]}>
    <Text style={styles.title}>Welcome back</Text>
    <Text style={styles.subtitle}>Login flow coming soon.</Text>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
  },
  title: {
    ...typography.heading,
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
  },
});

export default LoginScreen;
