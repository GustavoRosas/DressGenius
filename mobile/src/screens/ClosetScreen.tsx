/**
 * DressGenius — Closet Screen
 *
 * Full wardrobe CRUD: list (grid), add/edit (modal), delete (confirmation).
 * Uses expo-image-picker for camera/gallery. All strings via i18n.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useTheme } from '../context/ThemeContext';
import { palette, type ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryKey = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessories';

interface WardrobeItem {
  id: number;
  label?: string;
  name?: string;
  category: CategoryKey;
  colors?: string[] | null;
  color?: string | null;
  cover_image_url?: string;
  image_url?: string;
}

interface FormState {
  name: string;
  category: CategoryKey | '';
  color: string;
  imageUri: string;
}

const CATEGORIES: CategoryKey[] = [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'accessories',
];

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  top: palette.violet400,
  bottom: palette.gold500,
  dress: palette.coral400,
  outerwear: palette.green500,
  shoes: palette.amber500,
  accessories: palette.violet600,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

const INITIAL_FORM: FormState = { name: '', category: '', color: '', imageUri: '' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClosetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // List state
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Category picker state
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<any>('/wardrobe-items');
      const raw = res.data;
      const data: WardrobeItem[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
      setItems(data);
    } catch {
      setError(t('screens.closet.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [fetchItems]);

  // -------------------------------------------------------------------------
  // Image picking
  // -------------------------------------------------------------------------

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setForm((f) => ({ ...f, imageUri: result.assets[0].uri }));
      setFormErrors((e) => ({ ...e, imageUri: undefined }));
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setForm((f) => ({ ...f, imageUri: result.assets[0].uri }));
      setFormErrors((e) => ({ ...e, imageUri: undefined }));
    }
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert(t('screens.closet.photo'), '', [
      { text: t('screens.closet.takePhoto'), onPress: pickFromCamera },
      { text: t('screens.closet.chooseGallery'), onPress: pickFromGallery },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [t, pickFromCamera, pickFromGallery]);

  // -------------------------------------------------------------------------
  // Modal open/close
  // -------------------------------------------------------------------------

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((item: WardrobeItem) => {
    setEditingItem(item);
    setForm({
      name: item.label ?? item.name ?? '',
      category: item.category,
      color: (Array.isArray(item.colors) ? item.colors[0] : item.color) ?? '',
      imageUri: item.cover_image_url ?? item.image_url ?? '',
    });
    setFormErrors({});
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingItem(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
  }, []);

  // -------------------------------------------------------------------------
  // Validation & Save
  // -------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = t('screens.closet.nameRequired');
    if (!form.category) errs.category = t('screens.closet.categoryRequired');
    if (!form.imageUri && !editingItem) errs.imageUri = t('screens.closet.photoRequired');
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, editingItem, t]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const isLocalImage = form.imageUri.startsWith('file://') || form.imageUri.startsWith('content://');

      if (editingItem) {
        if (isLocalImage) {
          const fd = new FormData();
          fd.append('label', form.name.trim());
          fd.append('category', form.category);
          if (form.color.trim()) fd.append('color', form.color.trim());
          fd.append('image', {
            uri: form.imageUri,
            name: 'photo.jpg',
            type: 'image/jpeg',
          } as unknown as Blob);
          await api.patch(`/wardrobe-items/${editingItem.id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.patch(`/wardrobe-items/${editingItem.id}`, {
            label: form.name.trim(),
            category: form.category,
            color: form.color.trim() || null,
          });
        }
      } else {
        const fd = new FormData();
        fd.append('label', form.name.trim());
        fd.append('category', form.category);
        if (form.color.trim()) fd.append('color', form.color.trim());
        fd.append('image', {
          uri: form.imageUri,
          name: 'photo.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);
        await api.post('/wardrobe-items', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      closeModal();
      fetchItems();
    } catch {
      Alert.alert(t('common.error'), t('screens.closet.saveError'));
    } finally {
      setSaving(false);
    }
  }, [form, editingItem, validate, closeModal, fetchItems, t]);

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  const confirmDelete = useCallback(
    (item: WardrobeItem) => {
      Alert.alert(t('screens.closet.deleteTitle'), t('screens.closet.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.closet.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/wardrobe-items/${item.id}`);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {
              Alert.alert(t('common.error'), t('screens.closet.deleteError'));
            }
          },
        },
      ]);
    },
    [t],
  );

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const categoryLabel = useCallback(
    (key: CategoryKey) => t(`screens.closet.categories.${key}`),
    [t],
  );

  const renderItem = useCallback(
    ({ item }: { item: WardrobeItem }) => (
      <Pressable
        style={styles.card}
        onPress={() => openEditModal(item)}
        onLongPress={() => confirmDelete(item)}
        accessibilityRole="button"
        accessibilityLabel={item.label ?? item.name}
      >
        <Image source={{ uri: item.cover_image_url ?? item.image_url }} style={styles.cardImage} />
        <View style={styles.cardOverlay}>
          <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] ?? colors.primary }]}>
            <Text style={styles.badgeText}>{categoryLabel(item.category)}</Text>
          </View>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.label ?? item.name}
          </Text>
        </View>
      </Pressable>
    ),
    [openEditModal, confirmDelete, categoryLabel, styles, colors],
  );

  const keyExtractor = useCallback((item: WardrobeItem) => String(item.id), []);

  const listContentStyle = useMemo(
    () => [styles.listContent, items.length === 0 && styles.listContentEmpty],
    [items.length, styles],
  );

  // -------------------------------------------------------------------------
  // Empty / Error / Loading states
  // -------------------------------------------------------------------------

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>{error}</Text>
          <Button title={t('common.retry')} variant="outline" onPress={fetchItems} style={{ marginTop: spacing.lg }} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>👗</Text>
        <Text style={styles.emptyTitle}>{t('screens.closet.empty')}</Text>
        <Text style={styles.emptySubtitle}>{t('screens.closet.emptySubtitle')}</Text>
      </View>
    );
  }, [loading, error, t, fetchItems, styles]);

  // -------------------------------------------------------------------------
  // Category Picker Modal
  // -------------------------------------------------------------------------

  const renderCategoryPicker = () => (
    <Modal visible={categoryPickerVisible} transparent animationType="fade" onRequestClose={() => setCategoryPickerVisible(false)}>
      <Pressable style={styles.pickerOverlay} onPress={() => setCategoryPickerVisible(false)}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{t('screens.closet.category')}</Text>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.pickerOption, form.category === cat && styles.pickerOptionActive]}
              onPress={() => {
                setForm((f) => ({ ...f, category: cat }));
                setFormErrors((e) => ({ ...e, category: undefined }));
                setCategoryPickerVisible(false);
              }}
            >
              <View style={[styles.pickerDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
              <Text style={[styles.pickerOptionText, form.category === cat && styles.pickerOptionTextActive]}>
                {categoryLabel(cat)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('screens.closet.title')}</Text>
        {items.length > 0 && (
          <Text style={styles.headerCount}>{items.length}</Text>
        )}
      </View>

      {/* Loading */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={openAddModal} accessibilityRole="button" accessibilityLabel={t('screens.closet.addItem')}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? t('screens.closet.editItem') : t('screens.closet.addItem')}
              </Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {/* Image picker */}
            <Pressable style={styles.imagePicker} onPress={showImageOptions}>
              {form.imageUri ? (
                <Image source={{ uri: form.imageUri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderIcon}>📷</Text>
                  <Text style={styles.imagePlaceholderText}>{t('screens.closet.photo')}</Text>
                </View>
              )}
            </Pressable>
            {formErrors.imageUri && <Text style={styles.fieldError}>{formErrors.imageUri}</Text>}

            {/* Name */}
            <Input
              label={t('screens.closet.name')}
              value={form.name}
              onChangeText={(v) => {
                setForm((f) => ({ ...f, name: v }));
                setFormErrors((e) => ({ ...e, name: undefined }));
              }}
              error={formErrors.name}
              placeholder={t('screens.closet.name')}
            />

            {/* Category selector */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, formErrors.category ? styles.fieldLabelError : undefined]}>
                {t('screens.closet.category')}
              </Text>
              <Pressable
                style={[styles.selectField, formErrors.category ? styles.selectFieldError : undefined]}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Text style={form.category ? styles.selectText : styles.selectPlaceholder}>
                  {form.category ? categoryLabel(form.category as CategoryKey) : t('screens.closet.selectCategory')}
                </Text>
                <Text style={styles.selectArrow}>▾</Text>
              </Pressable>
              {formErrors.category && <Text style={styles.fieldError}>{formErrors.category}</Text>}
            </View>

            {/* Color */}
            <Input
              label={t('screens.closet.color')}
              value={form.color}
              onChangeText={(v) => setForm((f) => ({ ...f, color: v }))}
              placeholder={t('screens.closet.color')}
            />

            {/* Save */}
            <Button
              title={saving ? t('screens.closet.saving') : t('screens.closet.save')}
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={{ marginTop: spacing.sm }}
            />

            {/* Delete (edit mode only) */}
            {editingItem && (
              <Button
                title={t('screens.closet.delete')}
                variant="ghost"
                onPress={() => {
                  closeModal();
                  confirmDelete(editingItem);
                }}
                textStyle={{ color: colors.error }}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {renderCategoryPicker()}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: {
      ...typography.h2,
      color: colors.text,
    },
    headerCount: {
      ...typography.subtitle2,
      color: colors.textSecondary,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      minWidth: 28,
      textAlign: 'center',
    },

    // List
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 100,
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: CARD_GAP,
    },

    // Card
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      ...shadows.md,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    cardOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.xs,
      marginBottom: spacing.xxs,
    },
    badgeText: {
      ...typography.overline,
      color: '#FFFFFF',
      fontSize: 9,
    },
    cardName: {
      ...typography.subtitle2,
      color: '#FFFFFF',
    },

    // Empty
    emptyContainer: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptySubtitle: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // FAB
    fab: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.xl,
    },
    fabIcon: {
      fontSize: 28,
      color: colors.textInverse,
      lineHeight: 30,
      fontWeight: '300',
    },

    // Modal
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.text,
    },
    modalClose: {
      fontSize: 22,
      color: colors.textSecondary,
      padding: spacing.xs,
    },

    // Image picker
    imagePicker: {
      width: '100%',
      height: 200,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePlaceholderIcon: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    imagePlaceholderText: {
      ...typography.body2,
      color: colors.textSecondary,
    },

    // Category select
    fieldContainer: {
      marginBottom: spacing.lg,
    },
    fieldLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '600',
    },
    fieldLabelError: {
      color: colors.error,
    },
    selectField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.lg,
      height: 52,
    },
    selectFieldError: {
      borderColor: colors.error,
    },
    selectText: {
      ...typography.body1,
      color: colors.text,
    },
    selectPlaceholder: {
      ...typography.body1,
      color: colors.placeholder,
    },
    selectArrow: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    fieldError: {
      ...typography.caption,
      color: colors.error,
      marginTop: spacing.xs,
    },

    // Category picker overlay
    pickerOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerContainer: {
      width: SCREEN_WIDTH - spacing.xl * 2,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      ...shadows.lg,
    },
    pickerTitle: {
      ...typography.subtitle1,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    pickerOptionActive: {
      backgroundColor: colors.primaryLight,
    },
    pickerDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.md,
    },
    pickerOptionText: {
      ...typography.body1,
      color: colors.text,
    },
    pickerOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
