import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography } from '../theme/styles';
import { AuthStackParamList, RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';

export type SplashScreenNavigation = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigation>();
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'authenticated') {
      rootNavigation?.navigate('Main');
    } else if (status === 'unauthenticated') {
      navigation.replace('Onboarding');
    }
  }, [status, navigation, rootNavigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>HASH</Text>
      </View>
      <ActivityIndicator color={colors.accent} size="large" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: colors.accent,
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logo: {
    ...typography.heading,
    color: colors.accent,
    fontSize: 36,
    letterSpacing: 4,
  },
});

export default SplashScreen;
