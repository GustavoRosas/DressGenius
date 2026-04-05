/**
 * DressGenius — Profile Screen
 *
 * Focused profile: Avatar, name, email, edit info, password,
 * inline outfit history (last 3), sign out.
 * Settings moved to SettingsScreen.
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
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmModal } from '../components/ConfirmModal';
import { Input } from '../components/Input';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

const APP_VERSION = '1.0.0';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface OutfitChat {
  id: number;
  status?: string;
  created_at: string;
  preview_image_url?: string | null;
  image_url?: string | null;
  overall_score?: number | null;
  score?: number | null;
  score_label?: string | null;
  occasion?: string | null;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut, signIn, token } = useAuth();
  const { isPremium } = usePremium();
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
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  // History
  const [recentChats, setRecentChats] = useState<OutfitChat[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
      if (token) {
        await signIn(token, { id: u.id, email: u.email, name: u.name });
      }
    } catch {
      Alert.alert(t('common.error'), t('screens.profile.loadError'));
    } finally {
      setLoadingProfile(false);
    }
  }, [token, signIn, t]);

  const fetchRecentHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const { data } = await api.get<any>('/outfit-scans');
      // outfit-scans returns { data: [...], meta: {...} }
      const items = Array.isArray(data) ? data : (data.data ?? []);
      const sorted = [...items]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      setRecentChats(sorted);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchRecentHistory();
  }, [fetchProfile, fetchRecentHistory]);

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

  // Photo picker — opens beautiful bottom sheet
  const handlePickPhoto = () => {
    setPhotoPickerVisible(true);
  };

  const handlePickFromCamera = useCallback(async () => {
    setPhotoPickerVisible(false);
    // Small delay to let sheet close before opening camera
    await new Promise((res) => setTimeout(res, 300));
    await pickImage('camera');
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    setPhotoPickerVisible(false);
    await new Promise((res) => setTimeout(res, 300));
    await pickImage('gallery');
  }, []);

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
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 500) {
        showToast(t('screens.profile.photoErrorStorage'), 'error');
      } else {
        showToast(t('screens.profile.photoError'), 'error');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Sign out
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const handleSignOut = () => setShowSignOutModal(true);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.headerName}>{name || '—'}</Text>
            {isPremium && (
              <View style={{ backgroundColor: '#C9A84C20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ color: '#C9A84C', fontSize: 12, fontWeight: '700' }}>👑 Premium</Text>
              </View>
            )}
          </View>
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

        {/* ── Outfit History ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.outfitHistory')}</Text>
          {loadingHistory ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : recentChats.length > 0 ? (
            <>
              {recentChats.map((chat) => (
                <Pressable
                  key={chat.id}
                  style={styles.historyRow}
                  onPress={() => navigation.navigate('ScanDetail' as any, { scanId: chat.id })}
                >
                  {(chat.image_url || chat.preview_image_url) ? (
                    <Image
                      source={{ uri: (chat.image_url || chat.preview_image_url) ?? undefined }}
                      style={styles.historyThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                      <Text style={{ fontSize: 20 }}>👗</Text>
                    </View>
                  )}
                  <View style={styles.historyInfo}>
                    {(chat.score ?? chat.overall_score) != null && (
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>
                          {chat.score ?? chat.overall_score}/10
                        </Text>
                      </View>
                    )}
                    <Text style={styles.historyDate}>
                      {formatRelative(chat.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('History' as any)}
              >
                <Text style={styles.viewAllText}>{t('profile.viewAllHistory')}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyHistory}>
              {t('screens.history.empty')}
            </Text>
          )}
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

      {/* ── Photo Picker Bottom Sheet ── */}
      <BottomSheet
        visible={photoPickerVisible}
        onClose={() => setPhotoPickerVisible(false)}
        heightFraction={0.32}
      >
        <View style={styles.photoSheetContent}>
          <Text style={styles.photoSheetTitle}>{t('screens.profile.editPhoto')}</Text>

          <Pressable
            style={({ pressed }) => [styles.photoSheetOption, pressed && { opacity: 0.7 }]}
            onPress={handlePickFromCamera}
          >
            <Text style={styles.photoSheetOptionIcon}>📷</Text>
            <Text style={styles.photoSheetOptionText}>{t('screens.analyze.takePhoto')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.photoSheetOption, pressed && { opacity: 0.7 }]}
            onPress={handlePickFromGallery}
          >
            <Text style={styles.photoSheetOptionIcon}>🖼️</Text>
            <Text style={styles.photoSheetOptionText}>{t('screens.analyze.chooseGallery')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.photoSheetCancel, pressed && { opacity: 0.7 }]}
            onPress={() => setPhotoPickerVisible(false)}
          >
            <Text style={styles.photoSheetCancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <ConfirmModal
        visible={showSignOutModal}
        emoji="👋"
        title={t('screens.profile.signOutConfirm')}
        message={t('screens.profile.signOutMessage')}
        confirmLabel={t('screens.profile.signOut')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => { setShowSignOutModal(false); signOut(); }}
        onCancel={() => setShowSignOutModal(false)}
      />
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
    // Chevron
    chevron: {
      fontSize: 22,
      color: colors.textTertiary,
      fontWeight: '300',
    },
    // History
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    historyThumb: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.background,
    },
    historyThumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
    },
    historyInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    historyBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.xs,
      marginBottom: spacing.xxs,
    },
    historyBadgeText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
    },
    historyDate: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    viewAllButton: {
      marginTop: spacing.md,
      alignItems: 'center',
    },
    viewAllText: {
      ...typography.subtitle2,
      color: colors.primary,
      fontSize: 14,
    },
    emptyHistory: {
      ...typography.body2,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Version
    version: {
      ...typography.caption,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    // Photo Sheet
    photoSheetContent: {
      padding: spacing.xl,
    },
    photoSheetTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    photoSheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    photoSheetOptionIcon: {
      fontSize: 24,
      marginRight: spacing.md,
    },
    photoSheetOptionText: {
      ...typography.body1,
      color: colors.text,
    },
    photoSheetCancel: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    photoSheetCancelText: {
      ...typography.subtitle2,
      color: colors.error,
    },
  });
