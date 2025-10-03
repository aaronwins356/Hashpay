import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { layout, typography } from '../theme/styles';
import { AuthStackParamList, RootStackParamList } from '../types/navigation';

type LoginScreenNavigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

type LoginErrors = Partial<Record<'email' | 'password', string>>;

const showErrorToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('Login error', message);
  }
};

const getBiometricLabel = (types: LocalAuthentication.AuthenticationType[]): string => {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }

  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }

  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris Scan';
  }

  return 'Biometrics';
};

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigation>();
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const { login, biometricLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricSubmitting, setBiometricSubmitting] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          setBiometricAvailable(false);
          return;
        }

        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricLabel(getBiometricLabel(supportedTypes));
        setBiometricAvailable(true);
      } catch (error) {
        console.warn('Unable to query biometric hardware', error);
        setBiometricAvailable(false);
      }
    };

    void checkBiometrics();
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors: LoginErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    if (submitting) {
      return;
    }

    const isValid = validate();
    if (!isValid) {
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim(), password);
      rootNavigation?.navigate('Main');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log you in.';
      showErrorToast(message);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, validate, login, email, password, rootNavigation]);

  const handleBiometricLogin = useCallback(async () => {
    if (biometricSubmitting) {
      return;
    }

    setBiometricSubmitting(true);

    try {
      await biometricLogin();
      rootNavigation?.navigate('Main');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log you in with biometrics.';
      showErrorToast(message);
    } finally {
      setBiometricSubmitting(false);
    }
  }, [biometricSubmitting, biometricLogin, rootNavigation]);

  const handleNavigateToSignup = useCallback(() => {
    navigation.navigate('Signup');
  }, [navigation]);

  const biometricButtonLabel = useMemo(
    () => `Login with ${biometricLabel}`,
    [biometricLabel]
  );

  return (
    <SafeAreaView style={[layout.screen, styles.container]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to manage your HASH wallet.</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              value={email}
              onChangeText={value => {
                setEmail(value);
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              error={errors.email}
            />

            <Input
              label="Password"
              placeholder="Enter password"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={value => {
                setPassword(value);
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: undefined }));
                }
              }}
              error={errors.password}
            />

            <Button label="Login" onPress={handleLogin} loading={submitting} fullWidth />

            {biometricAvailable ? (
              <Button
                label={biometricButtonLabel}
                onPress={handleBiometricLogin}
                loading={biometricSubmitting}
                fullWidth
                style={styles.biometricButton}
              />
            ) : null}
          </View>

          <Text style={styles.footerText}>
            Don’t have an account?{' '}
            <Text style={styles.footerLink} onPress={handleNavigateToSignup}>
              Sign up
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  title: {
    ...typography.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '700',
  },
  biometricButton: {
    marginTop: 8,
  },
});

export default LoginScreen;
