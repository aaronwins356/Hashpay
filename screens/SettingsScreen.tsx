
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { exportKeys } from '../services/api';

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('HASH', message);
  }
};

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    safeArea: {
      paddingTop: 32,
    },
    container: {
      flex: 1,
      paddingBottom: 48,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      ...typography.heading,
      marginBottom: 8,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      ...typography.subheading,
      marginBottom: 12,
      color: colors.textSecondary,
    },
    modalContent: {
      alignItems: 'center',
    },
    seedPhrase: {
      ...typography.monospace,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLabel: {
      ...typography.body,
    },
    logoutButton: {
      marginTop: 32,
    },
  });

const SettingsScreen: React.FC = () => {
  const { logout } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [exporting, setExporting] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleExportKeys = useCallback(async () => {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      const phrase = await exportKeys();
      setSeedPhrase(phrase);
      setModalVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export keys right now.';
      showToast(message);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      await logout();
      showToast('Logged out successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to logout right now.';
      showToast(message);
    } finally {
      setLoggingOut(false);
    }
  }, [logout, loggingOut]);

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your account, preferences, and security.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Card>
            <Button
              label={exporting ? 'Exporting Keys...' : 'Export Recovery Phrase'}
              onPress={handleExportKeys}
              loading={exporting}
              fullWidth
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Card>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Dark Mode</Text>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={mode === 'dark' ? colors.surface : colors.cardBackground}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card>
            <Button
              label={loggingOut ? 'Logging out...' : 'Logout'}
              onPress={handleLogout}
              loading={loggingOut}
              fullWidth
              style={styles.logoutButton}
            />
          </Card>
        </View>
      </View>

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Recovery Phrase">
        <View style={styles.modalContent}>
          <Text style={styles.seedPhrase}>{seedPhrase}</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;
