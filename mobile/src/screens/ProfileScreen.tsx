/**
 * DressGenius — Profile Screen (#16)
 *
 * Header com foto, seções Info/Password/Settings/Account.
 * Todas as strings via i18n. Integra com API /me, /profile, /profile/password, /profile/photo.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageStyle,
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

const APP_VERSION = '1.0.0';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut, signIn, token } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();

  // Profile data
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Fetch user data on mount
  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const { data } = await api.get('/me');
      const u = data.user ?? data.data ?? data;
      setName(u.name ?? '');
      setEmail(u.email ?? '');
      setPhotoUrl(u.profile_photo_url ?? u.photo_url ?? u.avatar_url ?? null);
      // Sync auth context
      if (token) {
        await signIn(token, { id: u.id, email: u.email, name: u.name });
      }
    } catch {
      Alert.alert(t('common.error'), t('screens.profile.loadError'));
    } finally {
      setLoadingProfile(false);
    }
  }, [token, signIn, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const { data } = await api.patch('/profile', { name, email });
      const u = data.data ?? data;
      if (token) {
        await signIn(token, { id: u.id, email: u.email, name: u.name });
      }
      showToast(t('screens.profile.saved'), 'success');
    } catch {
      showToast(t('screens.profile.saveError'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    const errors: typeof passwordErrors = {};
    if (newPassword.length < 8) {
      errors.newPassword = t('auth.errors.passwordTooShort');
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t('auth.errors.passwordMismatch');
    }
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSavingPassword(true);
      await api.patch('/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
      showToast(t('screens.profile.passwordChanged'), 'success');
    } catch {
      showToast(t('screens.profile.passwordError'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Photo picker
  const handlePickPhoto = () => {
    Alert.alert(t('screens.profile.editPhoto'), '', [
      {
        text: t('screens.analyze.takePhoto'),
        onPress: () => pickImage('camera'),
      },
      {
        text: t('screens.analyze.chooseGallery'),
        onPress: () => pickImage('gallery'),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    const permResult =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert(
        t('screens.analyze.permissionTitle'),
        t('screens.analyze.permissionMessage', {
          resource: source === 'camera' ? 'camera' : 'gallery',
        }),
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    await uploadPhoto(asset.uri);
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      const filename = uri.split('/').pop() ?? 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const formData = new FormData();
      formData.append('photo', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      const { data } = await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const u = data.data ?? data;
      setPhotoUrl(u.photo_url ?? u.avatar_url ?? uri);
    } catch {
      Alert.alert(t('common.error'), t('screens.profile.photoError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    Alert.alert(t('screens.profile.signOutConfirm'), t('screens.profile.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('screens.profile.signOut'),
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={handlePickPhoto} style={styles.avatarContainer}>
            {uploadingPhoto ? (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar as ImageStyle} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {(name || email || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </Pressable>
          <Text style={styles.headerName}>{name || '—'}</Text>
          <Text style={styles.headerEmail}>{email}</Text>
        </View>

        {/* ── Info Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('screens.profile.title')}</Text>
          <Input
            label={t('screens.profile.name')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label={t('screens.profile.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            title={t('screens.profile.saveChanges')}
            onPress={handleSaveProfile}
            loading={savingProfile}
          />
        </View>

        {/* ── Password Card (collapsible) ── */}
        <Pressable
          style={styles.card}
          onPress={() => setShowPasswordSection((v) => !v)}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('screens.profile.changePassword')}</Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary, lineHeight: 20 }}>{showPasswordSection ? '▲' : '▼'}</Text>
          </View>
        </Pressable>
        {showPasswordSection && (
          <View style={[styles.card, { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <Input
              label={t('screens.profile.currentPassword')}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <Input
              label={t('screens.profile.newPassword')}
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                setPasswordErrors((e) => ({ ...e, newPassword: undefined }));
              }}
              secureTextEntry
              error={passwordErrors.newPassword}
            />
            <Input
              label={t('screens.profile.confirmPassword')}
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                setPasswordErrors((e) => ({ ...e, confirmPassword: undefined }));
              }}
              secureTextEntry
              error={passwordErrors.confirmPassword}
            />
            <Button
              title={t('screens.profile.changePassword')}
              variant="outline"
              onPress={handleChangePassword}
              loading={savingPassword}
            />
          </View>
        )}

        {/* ── Settings Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('screens.profile.settings')}</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('screens.profile.language')}</Text>
            <LanguageSwitcher />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
            <ThemeToggle />
          </View>

          <Pressable
            style={styles.settingRow}
            onPress={() => navigation.navigate('AIPreferences')}
          >
            <Text style={styles.settingLabel}>{t('screens.profile.aiPreferences')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.settingRow}
            onPress={() => navigation.navigate('NotificationPrefs' as any)}
          >
            <Text style={styles.settingLabel}>{t('screens.profile.notifications')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.settingRow}
            onPress={() => navigation.navigate('Paywall')}
          >
            <Text style={styles.settingLabel}>{t('screens.profile.subscription')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* ── Account Card ── */}
        <View style={styles.card}>
          <Button
            title={t('screens.profile.signOut')}
            variant="ghost"
            onPress={handleSignOut}
            textStyle={{ color: colors.error }}
          />
        </View>

        {/* ── Version ── */}
        <Text style={styles.version}>
          {t('screens.profile.version', { version: APP_VERSION })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 100;

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    // Header
    header: {
      alignItems: 'center',
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: spacing.md,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      ...typography.h1,
      color: colors.primary,
    },
    cameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
    },
    cameraIcon: {
      fontSize: 16,
    },
    headerName: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.xxs,
    },
    headerEmail: {
      ...typography.body2,
      color: colors.textSecondary,
    },
    // Cards
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    sectionTitle: {
      ...typography.subtitle2,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    // Settings
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    settingLabel: {
      ...typography.body1,
      color: colors.text,
    },
    chevron: {
      ...typography.h3,
      color: colors.textTertiary,
    },
    // Version
    version: {
      ...typography.caption,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
