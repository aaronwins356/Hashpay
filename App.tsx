
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
import SendScreen from './screens/SendScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BalanceProvider } from './contexts/BalanceContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Button } from './components/Button';
import { useThemedStyles, TypographyStyles } from './theme/styles';
import type { ThemeColors } from './theme/colors';
import { AuthStackParamList, HomeStackParamList, MainTabParamList, RootStackParamList } from './types/navigation';

const createErrorBoundaryStyles = (colors: ThemeColors, typography: TypographyStyles): ErrorBoundaryStyles =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    title: {
      ...typography.heading,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
  });

type ErrorBoundaryStyles = ReturnType<typeof createErrorBoundaryStyles>;

class ScreenErrorBoundary extends React.Component<{ children: React.ReactNode; styles: ErrorBoundaryStyles }, { hasError: boolean }> {
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
      const { styles } = this.props;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>Please try again or restart the app.</Text>
          <Button label="Retry" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

const withScreenErrorBoundary = <P extends object>(Component: React.ComponentType<P>): React.FC<P> => {
  const WrappedComponent: React.FC<P> = props => {
    const { colors } = useTheme();
    const { typography } = useThemedStyles();
    const styles = useMemo(() => createErrorBoundaryStyles(colors, typography), [colors, typography]);

    return (
      <ScreenErrorBoundary styles={styles}>
        <Component {...props} />
      </ScreenErrorBoundary>
    );
  };

  return WrappedComponent;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain" component={withScreenErrorBoundary(HomeScreen)} />
    <HomeStack.Screen name="Send" component={withScreenErrorBoundary(SendScreen)} />
    <HomeStack.Screen name="Receive" component={withScreenErrorBoundary(ReceiveScreen)} />
  </HomeStack.Navigator>
);

const AuthStackNavigator: React.FC = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
    <AuthStack.Screen name="Splash" component={withScreenErrorBoundary(SplashScreen)} />
    <AuthStack.Screen name="Onboarding" component={withScreenErrorBoundary(OnboardingScreen)} />
    <AuthStack.Screen name="Signup" component={withScreenErrorBoundary(SignupScreen)} />
    <AuthStack.Screen name="Login" component={withScreenErrorBoundary(LoginScreen)} />
  </AuthStack.Navigator>
);

const MainTabsNavigator: React.FC = () => {
  const { colors } = useTheme();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      paddingBottom: 8,
      height: 70,
    }),
    [colors]
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,
        tabBarIcon: ({ color, size }) => {
          const iconName = route.name === 'Home' ? 'home' : route.name === 'History' ? 'time' : 'settings';
          return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="History" component={withScreenErrorBoundary(HistoryScreen)} />
      <Tab.Screen name="Settings" component={withScreenErrorBoundary(SettingsScreen)} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { status } = useAuth();
  const { colors } = useTheme();
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
        card: colors.surface,
        notification: colors.accent,
      },
    }),
    [colors]
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

const ThemedProviders: React.FC = () => {
  const { colors, mode } = useTheme();
  const containerStyle = useMemo(() => ({ flex: 1, backgroundColor: colors.background }), [colors]);

  return (
    <View style={containerStyle}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <AuthProvider>
        <BalanceProvider>
          <AppNavigator />
        </BalanceProvider>
      </AuthProvider>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedProviders />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
