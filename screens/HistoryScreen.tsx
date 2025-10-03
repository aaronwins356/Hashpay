import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { layout, typography } from '../theme/styles';

const HistoryScreen: React.FC = () => (
  <SafeAreaView style={[layout.screen, styles.container]}>
    <Text style={styles.title}>Transaction History</Text>
    <Text style={styles.subtitle}>Your past activity will appear here.</Text>
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

export default HistoryScreen;
