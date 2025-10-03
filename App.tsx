import 'react-native-gesture-handler';
import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BalanceProvider } from './contexts/BalanceContext';
import { Button } from './components/Button';
import { colors } from './theme/colors';
import { typography } from './theme/styles';
import { AuthStackParamList, MainTabParamList, RootStackParamList } from './types/navigation';

class ScreenErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Screen rendering error:', error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>Please try again or restart the app.</Text>
          <Button label="Retry" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

const withScreenErrorBoundary = <P extends object>(Component: React.ComponentType<P>): React.FC<P> => {
  return function ScreenWithBoundary(props: P) {
    return (
      <ScreenErrorBoundary>
        <Component {...props} />
      </ScreenErrorBoundary>
    );
  };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthStackNavigator: React.FC = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
    <AuthStack.Screen name="Splash" component={withScreenErrorBoundary(SplashScreen)} />
    <AuthStack.Screen name="Onboarding" component={withScreenErrorBoundary(OnboardingScreen)} />
    <AuthStack.Screen name="Signup" component={withScreenErrorBoundary(SignupScreen)} />
    <AuthStack.Screen name="Login" component={withScreenErrorBoundary(LoginScreen)} />
  </AuthStack.Navigator>
);

const MainTabsNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: '#050505',
        borderTopColor: colors.border,
        paddingBottom: 8,
        height: 70,
      },
      tabBarIcon: ({ color, size }) => {
        const iconName = route.name === 'Home'
          ? 'home'
          : route.name === 'History'
          ? 'time'
          : 'settings';
        return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={withScreenErrorBoundary(HomeScreen)} />
    <Tab.Screen name="History" component={withScreenErrorBoundary(HistoryScreen)} />
    <Tab.Screen name="Settings" component={withScreenErrorBoundary(SettingsScreen)} />
  </Tab.Navigator>
);

const AppNavigator: React.FC = () => {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  const navigationTheme: Theme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        primary: colors.accent,
        text: colors.textPrimary,
        border: colors.border,
        card: '#111111',
        notification: colors.accent,
      },
    }),
    []
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabsNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthProvider>
          <BalanceProvider>
            <AppNavigator />
          </BalanceProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default App;
