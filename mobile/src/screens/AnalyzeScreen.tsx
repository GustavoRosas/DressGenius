/**
 * DressGenius — Analyze Screen
 *
 * 3-state flow: Choose → Preview → Result
 * Camera/gallery → upload multipart → show AI analysis.
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
import { useTheme } from '../context/ThemeContext';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [state, setState] = useState<ScreenState>('initial');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

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

  // — Image picking —
  const handlePickResult = useCallback(
    (pickerResult: ImagePicker.ImagePickerResult) => {
      if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
        const uri = pickerResult.assets[0].uri;
        animateTransition(() => {
          setImageUri(uri);
          setError(null);
          setState('preview');
        });
      }
    },
    [animateTransition],
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

  // — Upload & Analyze —
  const analyzeOutfit = useCallback(async () => {
    if (!imageUri) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'outfit.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await api.post<AnalysisResult>('/outfit-scans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      animateTransition(() => {
        setResult(response.data);
        setState('result');
      });
    } catch (_err) {
      setError(t('screens.analyze.error'));
    } finally {
      setLoading(false);
    }
  }, [imageUri, animateTransition, t]);

  // — Reset —
  const resetScreen = useCallback(() => {
    animateTransition(() => {
      setState('initial');
      setImageUri(null);
      setResult(null);
      setError(null);
    });
  }, [animateTransition]);

  const chooseAnother = useCallback(() => {
    animateTransition(() => {
      setState('initial');
      setImageUri(null);
      setError(null);
    });
  }, [animateTransition]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // — Render helpers —
  const renderInitial = () => (
    <View style={styles.centerContent}>
      <Text style={styles.title}>{t('screens.analyze.title')}</Text>
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
            onPress={analyzeOutfit}
            style={styles.retryButton}
          />
        </View>
      )}

      <View style={styles.buttonGroup}>
        <Button
          title={loading ? t('screens.analyze.analyzing') : t('screens.analyze.analyzeButton')}
          variant="primary"
          onPress={analyzeOutfit}
          loading={loading}
          disabled={loading}
          style={styles.actionButton}
        />
        <Button
          title={t('screens.analyze.chooseAnother')}
          variant="outline"
          onPress={chooseAnother}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
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

    // — Header —
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
