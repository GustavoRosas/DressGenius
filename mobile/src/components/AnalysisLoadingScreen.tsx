/**
 * DressGenius — Analysis Loading Screen
 *
 * Full-screen loading experience with blurred photo background,
 * rotating fashion phrases, and shimmer progress bar.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const PHRASES_EN = [
  'Dusting off the virtual wardrobe…',
  'Your AI stylist is taking a look…',
  'Analyzing every detail of your look…',
  'Calibrating your personal style DNA…',
  'Flipping through this week\'s trends…',
  'Asking the fashion oracle…',
  'Matching color palettes…',
  'Checking the outfit vibe…',
  'Drawing runway inspiration…',
  'Breaking down every layer of your look…',
  'Consulting the Milan Fashion Week archives…',
  'Evaluating proportions and silhouette…',
  'Discovering your signature style…',
  'Applying the rules — and breaking the right ones…',
];

const PHRASES_PT = [
  'Tirando poeira do armário virtual…',
  'Seu estilista de IA está analisando…',
  'Analisando cada detalhe do seu look…',
  'Calibrando o seu DNA de estilo…',
  'Folheando as tendências da semana…',
  'Perguntando ao fashion oracle…',
  'Combinando paletas de cor…',
  'Verificando a vibe do outfit…',
  'Buscando inspiração nas passarelas…',
  'Destrinchando cada camada do look…',
  'Consultando a Semana de Moda de Milão…',
  'Avaliando proporções e silhueta…',
  'Procurando o seu estilo signature…',
  'Aplicando as regras (e quebrando as certas)…',
];

const LAST_PHRASE_EN = 'Almost there… your look is about to be revealed…';
const LAST_PHRASE_PT = 'Quase lá… o look está sendo revelado…';

const CYCLE_MS = 3500;

interface Props {
  imageUri: string;
  visible: boolean;
}

export function AnalysisLoadingScreen({ imageUri, visible }: Props) {
  const { i18n } = useTranslation();
  const isPt = i18n.language?.startsWith('pt');
  const phrases = isPt ? PHRASES_PT : PHRASES_EN;
  const lastPhrase = isPt ? LAST_PHRASE_PT : LAST_PHRASE_EN;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Shuffle phrases on mount
  const shuffled = useMemo(() => {
    const arr = [...phrases];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phrase rotation
  useEffect(() => {
    if (!visible) return;
    setPhraseIndex(0);
    fadeAnim.setValue(0);
    translateAnim.setValue(8);

    const animatePhrase = () => {
      fadeAnim.setValue(0);
      translateAnim.setValue(8);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    };

    animatePhrase();

    const interval = setInterval(() => {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateAnim, { toValue: -4, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setPhraseIndex((prev) => {
          const next = prev + 1;
          if (next >= shuffled.length) return prev; // stay on last
          return next;
        });
        animatePhrase();
      });
    }, CYCLE_MS);

    return () => clearInterval(interval);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shimmer animation
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, shimmerAnim]);

  const currentPhrase = phraseIndex >= shuffled.length ? lastPhrase : shuffled[phraseIndex];

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Blurred background photo */}
      <Image
        source={{ uri: imageUri }}
        style={styles.bgImage}
        blurRadius={12}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.brand}>✨ DressGenius</Text>

        <Animated.View
          style={[
            styles.phraseContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            },
          ]}
        >
          <Text style={styles.phrase}>{currentPhrase}</Text>
        </Animated.View>

        {/* Shimmer progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressShimmer,
              {
                transform: [
                  {
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-200, 300],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  brand: {
    ...typography.h3,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xxxl,
    letterSpacing: 1,
  },
  phraseContainer: {
    minHeight: 70,
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
  },
  phrase: {
    fontSize: 22,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
  },
  progressTrack: {
    width: '80%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressShimmer: {
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 1,
  },
});
