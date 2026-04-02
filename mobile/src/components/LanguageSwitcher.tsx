import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import type { ColorScheme } from '../theme/colors';

const LANG_KEY = 'dressgenius_language';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'pt-BR', label: 'PT' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);

  // Load persisted language on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        if (saved && saved !== i18n.language) {
          await i18n.changeLanguage(saved);
        }
      } catch {
        // ignore
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const changeLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    try {
      await SecureStore.setItemAsync(LANG_KEY, code);
    } catch {
      // ignore storage errors
    }
  };

  const s = useMemo(() => createStyles(colors), [colors]);

  if (!ready) return null;

  return (
    <View style={s.container}>
      {languages.map((lang) => {
        const isActive = i18n.language === lang.code ||
          (lang.code === 'en' && i18n.language.startsWith('en')) ||
          (lang.code === 'pt-BR' && i18n.language.startsWith('pt'));

        return (
          <Pressable
            key={lang.code}
            onPress={() => changeLanguage(lang.code)}
            style={[s.button, isActive && s.buttonActive]}
          >
            <Text style={[s.label, isActive && s.labelActive]}>
              {lang.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.border,
      alignSelf: 'center',
    },
    button: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    buttonActive: {
      backgroundColor: colors.primary,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.textInverse,
    },
  });
