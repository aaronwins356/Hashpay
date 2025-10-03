import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { layout, typography } from '../theme/styles';
import { Button } from '../components/Button';
import { AuthStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  key: string;
  title: string;
  subtitle: string;
  illustration: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    key: 'secure-wallet',
    title: 'Self-Custody Wallet',
    subtitle: 'Securely store and manage your Bitcoin with institutional-grade security.',
    illustration: '🔐',
  },
  {
    key: 'instant-payments',
    title: 'Instant Lightning Payments',
    subtitle: 'Send and receive BTC instantly with the Lightning Network.',
    illustration: '⚡️',
  },
  {
    key: 'smart-analytics',
    title: 'Smart Portfolio Insights',
    subtitle: 'Track performance, set alerts, and stay informed with real-time analytics.',
    illustration: '📊',
  },
];

export type OnboardingNavigation = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigation>();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const renderItem: ListRenderItem<OnboardingSlide> = useCallback(({ item }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <Text style={styles.illustration}>{item.illustration}</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    );
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('Signup');
  };

  const handleNext = () => {
    const nextIndex = Math.min(activeIndex + 1, SLIDES.length - 1);
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  return (
    <SafeAreaView style={layout.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
      />
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View key={_.key} style={[styles.indicator, index === activeIndex && styles.activeIndicator]} />
          ))}
        </View>
        <Button
          label={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={activeIndex === SLIDES.length - 1 ? handleGetStarted : handleNext}
          fullWidth
          style={styles.primaryButton}
        />
        <Button
          label="Log In"
          onPress={() => navigation.navigate('Login')}
          fullWidth
          style={styles.secondaryButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  slide: {
    paddingTop: 60,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  illustrationCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  illustration: {
    fontSize: 72,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: colors.accent,
    width: 24,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF10',
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 16,
  },
});

export default OnboardingScreen;
