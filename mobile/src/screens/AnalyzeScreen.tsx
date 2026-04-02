/**
 * DressGenius — Analyze Screen
 *
 * 3-state flow: Choose → Preview (Bottom Sheet intake) → Result
 * Camera/gallery → intake form → upload multipart → show AI analysis.
 *
 * Integrates:
 *  #50 — Usage counter chip
 *  #51 — Soft paywall modal
 *  #52 — Bottom sheet intake form
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../components/Button';
import { UsageChip } from '../components/UsageChip';
import { SoftPaywallModal } from '../components/SoftPaywallModal';
import { AnalyzeIntakeSheet } from '../components/AnalyzeIntakeSheet';
import type { IntakeData } from '../components/AnalyzeIntakeSheet';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useUsage } from '../hooks/useUsage';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

type ScreenState = 'initial' | 'preview' | 'result';

interface AnalysisResult {
  id?: number;
  analysis?: string;
  [key: string]: unknown;
}

export function AnalyzeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isPremium } = usePremium();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usage, refetch: refetchUsage } = useUsage();

  const [state, setState] = useState<ScreenState>('initial');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Bottom sheet & paywall state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // — Animations —
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (next: () => void) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        next();
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  // — Permissions —
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('screens.analyze.permissionTitle'),
        t('screens.analyze.permissionMessage', { resource: 'camera' }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('screens.analyze.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  }, [t]);

  const requestGalleryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('screens.analyze.permissionTitle'),
        t('screens.analyze.permissionMessage', { resource: 'gallery' }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('screens.analyze.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  }, [t]);

  // — Image picking → open bottom sheet —
  const handlePickResult = useCallback(
    (pickerResult: ImagePicker.ImagePickerResult) => {
      if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
        const uri = pickerResult.assets[0].uri;
        setImageUri(uri);
        setError(null);
        setState('preview');
        setSheetVisible(true);
      }
    },
    [],
  );

  const takePhoto = useCallback(async () => {
    const granted = await requestCameraPermission();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    handlePickResult(result);
  }, [requestCameraPermission, handlePickResult]);

  const chooseFromGallery = useCallback(async () => {
    const granted = await requestGalleryPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    handlePickResult(result);
  }, [requestGalleryPermission, handlePickResult]);

  // — Upload & Analyze (with paywall check) —
  const analyzeOutfit = useCallback(
    async (intake: IntakeData) => {
      if (!imageUri) return;

      // #51 — Soft paywall: check usage before analyzing
      if (!isPremium && usage && usage.analyses_used >= usage.analyses_limit) {
        setSheetVisible(false);
        setPaywallVisible(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: 'outfit.jpg',
          type: 'image/jpeg',
        } as any);

        // #52 — Append intake data
        if (intake.occasion) {
          formData.append('occasion', intake.occasion);
        }
        formData.append('comfort_level', intake.comfort_level);
        if (intake.extra_context) {
          formData.append('extra_context', intake.extra_context);
        }

        const response = await api.post<AnalysisResult>('/outfit-scans', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setSheetVisible(false);

        // Refetch usage after successful analysis
        refetchUsage();

        animateTransition(() => {
          setResult(response.data);
          setState('result');
        });
      } catch (_err) {
        setError(t('screens.analyze.error'));
      } finally {
        setLoading(false);
      }
    },
    [imageUri, isPremium, usage, animateTransition, t, refetchUsage],
  );

  // — Reset —
  const resetScreen = useCallback(() => {
    animateTransition(() => {
      setState('initial');
      setImageUri(null);
      setResult(null);
      setError(null);
      setSheetVisible(false);
    });
  }, [animateTransition]);

  const chooseAnother = useCallback(() => {
    setSheetVisible(false);
    animateTransition(() => {
      setState('initial');
      setImageUri(null);
      setError(null);
    });
  }, [animateTransition]);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    // Go back to initial if no result yet
    if (state === 'preview') {
      animateTransition(() => {
        setState('initial');
        setImageUri(null);
        setError(null);
      });
    }
  }, [state, animateTransition]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // — Render helpers —
  const renderInitial = () => (
    <View style={styles.centerContent}>
      {/* #50 — Usage chip in header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('screens.analyze.title')}</Text>
        <UsageChip usage={usage} />
      </View>
      <Text style={styles.subtitle}>{t('screens.analyze.subtitle')}</Text>

      <View style={styles.cardsRow}>
        <Pressable style={styles.card} onPress={takePhoto} accessibilityRole="button">
          <Text style={styles.cardIcon}>📸</Text>
          <Text style={styles.cardTitle}>{t('screens.analyze.takePhoto')}</Text>
          <Text style={styles.cardDesc}>{t('screens.analyze.takePhotoDesc')}</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={chooseFromGallery} accessibilityRole="button">
          <Text style={styles.cardIcon}>🖼️</Text>
          <Text style={styles.cardTitle}>{t('screens.analyze.chooseGallery')}</Text>
          <Text style={styles.cardDesc}>{t('screens.analyze.chooseGalleryDesc')}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.centerContent}>
      {/* Dimmed background preview while sheet is open */}
      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title={t('screens.analyze.errorRetry')}
            variant="outline"
            onPress={() => setSheetVisible(true)}
            style={styles.retryButton}
          />
        </View>
      )}

      {!sheetVisible && (
        <View style={styles.buttonGroup}>
          <Button
            title={`✨ ${t('screens.analyze.analyzeButton')}`}
            variant="primary"
            onPress={() => setSheetVisible(true)}
            style={styles.actionButton}
          />
          <Button
            title={t('screens.analyze.chooseAnother')}
            variant="outline"
            onPress={chooseAnother}
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );

  const renderResult = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {imageUri && (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
        </View>
      )}

      <View style={styles.resultCard}>
        <Text style={styles.resultText}>
          {result?.analysis || JSON.stringify(result, null, 2)}
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title={t('screens.analyze.newAnalysis')}
          variant="primary"
          onPress={resetScreen}
          style={styles.actionButton}
        />
        <Button
          title={t('screens.analyze.startChat')}
          variant="outline"
          onPress={() => {
            if (result?.id) {
              navigation.navigate('Chat', { chatId: result.id });
            }
          }}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        {state === 'initial' && renderInitial()}
        {state === 'preview' && renderPreview()}
        {state === 'result' && renderResult()}
      </Animated.View>

      {/* #52 — Bottom Sheet Intake Form */}
      <AnalyzeIntakeSheet
        visible={sheetVisible}
        imageUri={imageUri}
        loading={loading}
        onAnalyze={analyzeOutfit}
        onClose={handleSheetClose}
      />

      {/* #51 — Soft Paywall Modal */}
      <SoftPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    animatedContainer: {
      flex: 1,
    },
    centerContent: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxxl,
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxxl,
      alignItems: 'center',
    },

    // — Header with usage chip —
    headerRow: {
      width: '100%',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.h1,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xxxl,
      paddingHorizontal: spacing.lg,
    },

    // — Cards —
    cardsRow: {
      flexDirection: 'column',
      gap: spacing.lg,
      width: '100%',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      ...shadows.md,
    },
    cardIcon: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    cardTitle: {
      ...typography.subtitle1,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    cardDesc: {
      ...typography.body2,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // — Preview —
    previewContainer: {
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadows.lg,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },

    // — Result —
    thumbnailContainer: {
      width: 120,
      height: 160,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadows.md,
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    resultCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      ...shadows.md,
    },
    resultText: {
      ...typography.body1,
      color: colors.text,
    },

    // — Buttons —
    buttonGroup: {
      width: '100%',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    actionButton: {
      width: '100%',
    },

    // — Error —
    errorContainer: {
      width: '100%',
      backgroundColor: colors.errorBackground,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    errorText: {
      ...typography.body2,
      color: colors.error,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    retryButton: {
      minWidth: 140,
    },
  });
