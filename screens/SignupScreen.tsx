import React, { useCallback, useMemo, useState } from 'react';
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
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { layout, typography } from '../theme/styles';
import { AuthStackParamList, RootStackParamList } from '../types/navigation';

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_NUMBER_REGEX = /\d/;

type SignupScreenNavigation = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

interface SignupErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const showErrorToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('Signup error', message);
  }
};

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<SignupScreenNavigation>();
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback((): boolean => {
    const nextErrors: SignupErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = 'Password must be at least 8 characters.';
    } else if (!PASSWORD_NUMBER_REGEX.test(password)) {
      nextErrors.password = 'Password must include at least one number.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [email, password, confirmPassword]);

  const helperText = useMemo(() => 'Password must be at least 8 characters and contain a number.', []);

  const handleSignup = useCallback(async () => {
    if (submitting) {
      return;
    }

    const isValid = validate();
    if (!isValid) {
      return;
    }

    setSubmitting(true);

    try {
      await signup(email.trim(), password);
      rootNavigation?.navigate('Main');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your account.';
      showErrorToast(message);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, validate, signup, email, password, rootNavigation]);

  const handleNavigateToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  return (
    <SafeAreaView style={[layout.screen, styles.container]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Sign up to start sending and receiving crypto instantly.</Text>

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

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              secureTextEntry
              textContentType="password"
              value={confirmPassword}
              onChangeText={value => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
            />

            <Text style={styles.helperText}>{helperText}</Text>

            <Button label="Sign Up" onPress={handleSignup} loading={submitting} fullWidth />
          </View>

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.footerLink} onPress={handleNavigateToLogin}>
              Log in
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
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 16,
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
});

export default SignupScreen;
