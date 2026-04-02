/**
 * DressGenius — Onboarding Screen
 *
 * 4 swipeable slides introducing the app features.
 * Persists completion flag in SecureStore so it only shows once.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

export const ONBOARDING_KEY = 'dressgenius_onboarding_complete';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideData {
  key: string;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
}

const SLIDES: SlideData[] = [
  {
    key: 'slide1',
    emoji: '📸',
    titleKey: 'onboarding.slide1Title',
    subtitleKey: 'onboarding.slide1Subtitle',
  },
  {
    key: 'slide2',
    emoji: '💬',
    titleKey: 'onboarding.slide2Title',
    subtitleKey: 'onboarding.slide2Subtitle',
  },
  {
    key: 'slide3',
    emoji: '👔',
    titleKey: 'onboarding.slide3Title',
    subtitleKey: 'onboarding.slide3Subtitle',
  },
  {
    key: 'slide4',
    emoji: '✨',
    titleKey: 'onboarding.slide4Title',
    subtitleKey: 'onboarding.slide4Subtitle',
  },
];

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const flatListRef = useRef<FlatList<SlideData>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Per-slide fade animations
  const fadeAnims = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  const completeOnboarding = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  const goToSlide = useCallback(
    (index: number) => {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      goToSlide(activeIndex + 1);
    }
  }, [activeIndex, goToSlide]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const newIndex = viewableItems[0].index;
        setActiveIndex(newIndex);

        // Fade in the new slide
        fadeAnims.forEach((anim, i) => {
          Animated.timing(anim, {
            toValue: i === newIndex ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderSlide = useCallback(
    ({ item, index }: { item: SlideData; index: number }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <Animated.View
          style={[styles.slideContent, { opacity: fadeAnims[index] }]}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t(item.titleKey)}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(item.subtitleKey)}</Text>
        </Animated.View>
      </View>
    ),
    [fadeAnims, t, colors],
  );

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const dynamicStyles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* Skip button */}
      <View style={styles.header}>
        {!isLastSlide ? (
          <Pressable onPress={completeOnboarding} hitSlop={12}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('onboarding.skip')}</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom area: dots + button */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: colors.primary }]
                  : { backgroundColor: colors.disabled },
              ]}
            />
          ))}
        </View>

        {/* Action button */}
        <View style={styles.buttonContainer}>
          {isLastSlide ? (
            <Button
              title={t('onboarding.getStarted')}
              variant="primary"
              onPress={completeOnboarding}
              style={styles.button}
            />
          ) : (
            <Button
              title={t('onboarding.next')}
              variant="primary"
              onPress={handleNext}
              style={styles.button}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  skipText: {
    ...typography.body1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  slideContent: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body1,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  bottomArea: {
    paddingHorizontal: spacing.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: spacing.xs,
  },
  dotActive: {
    width: 24,
    borderRadius: 5,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  button: {
    width: SCREEN_WIDTH - spacing.xl * 2,
  },
});
