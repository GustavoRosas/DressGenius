/**
 * DressGenius — Chat Screen
 *
 * AI outfit chat conversation with inverted FlatList (WhatsApp-style),
 * message bubbles, typing indicator, finish + feedback flow.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatDetail {
  id: number;
  status: string;
  messages: ChatMessage[];
}

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatNavProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ label, colors }: { label: string; colors: ColorScheme }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.typingRow}>
      <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot1)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot2)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot3)]} />
        </View>
        <Text style={styles.typingLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  rating,
  onRate,
  labels,
  colors,
}: {
  rating: number;
  onRate: (n: number) => void;
  labels: Record<string, string>;
  colors: ColorScheme;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.starsContainer}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onRate(n)} style={styles.starButton}>
            <Text style={[styles.starIcon, { color: colors.disabled }, n <= rating && { color: colors.secondary }]}>
              {n <= rating ? '★' : '☆'}
            </Text>
          </Pressable>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {labels[String(rating)] ?? ''}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<ChatNavProp>();
  const { chatId } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [chatFinished, setChatFinished] = useState(false);

  // Feedback modal
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // ─── Header ───────────────────────────────────────────────────────────

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('screens.chat.title'),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { ...typography.subtitle1, color: colors.text },
      headerRight: () =>
        !chatFinished ? (
          <Pressable onPress={handleFinish} hitSlop={8}>
            <Text style={[styles.headerAction, { color: colors.primary }]}>{t('screens.chat.finish')}</Text>
          </Pressable>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatFinished, t, colors]);

  // ─── Fetch messages ───────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<ChatDetail>(`/outfit-chats/${chatId}`);
      setMessages(data.messages ?? []);
      if (data.status === 'finished') {
        setChatFinished(true);
      }
    } catch {
      Alert.alert(t('common.error'), t('screens.chat.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [chatId, t]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ─── Send message ─────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const content = inputText.trim();
    if (!content || sending || chatFinished) return;

    // Optimistic user message
    const tempId = Date.now();
    const userMsg: ChatMessage = {
      id: tempId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    setAiTyping(true);

    try {
      const { data } = await api.post<{ user_message: ChatMessage; ai_message: ChatMessage }>(
        `/outfit-chats/${chatId}/messages`,
        { content },
      );

      setMessages((prev) => {
        // Replace temp user msg + append AI response
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const updated = [...withoutTemp, data.user_message];
        if (data.ai_message) {
          updated.push(data.ai_message);
        }
        return updated;
      });
    } catch {
      // Remove optimistic msg on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert(t('common.error'), t('screens.chat.errorSend'));
    } finally {
      setSending(false);
      setAiTyping(false);
    }
  }, [inputText, sending, chatFinished, chatId, t]);

  // ─── Finish chat ──────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    Alert.alert(t('screens.chat.finishConfirm'), t('screens.chat.finishConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/outfit-chats/${chatId}/finish`);
            setChatFinished(true);
            setFeedbackVisible(true);
          } catch {
            Alert.alert(t('common.error'), t('screens.chat.errorFinish'));
          }
        },
      },
    ]);
  }, [chatId, t]);

  // ─── Submit feedback ──────────────────────────────────────────────────

  const submitFeedback = useCallback(async () => {
    if (feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    try {
      await api.post(`/outfit-chats/${chatId}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment.trim() || undefined,
      });
      setFeedbackVisible(false);
      Alert.alert('', t('screens.chat.feedbackThanks'));
    } catch {
      Alert.alert(t('common.error'), t('screens.chat.errorFeedback'));
    } finally {
      setFeedbackSubmitting(false);
    }
  }, [chatId, feedbackRating, feedbackComment, t]);

  // ─── Timestamp helper ─────────────────────────────────────────────────

  const formatTime = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // ─── Render message ───────────────────────────────────────────────────

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      return (
        <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
          <View
            style={[
              styles.bubble,
              isUser ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.aiBubbleText]}>
              {item.content}
            </Text>
            <Text
              style={[
                styles.timestamp,
                isUser ? styles.timestampUser : styles.timestampAI,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      );
    },
    [formatTime, styles],
  );

  const keyExtractor = useCallback((item: ChatMessage) => String(item.id), []);

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const ratingLabels: Record<string, string> = {
    '1': t('screens.chat.rating.1'),
    '2': t('screens.chat.rating.2'),
    '3': t('screens.chat.rating.3'),
    '4': t('screens.chat.rating.4'),
    '5': t('screens.chat.rating.5'),
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={aiTyping ? <TypingIndicator label={t('screens.chat.aiTyping')} colors={colors} /> : null}
        />

        {/* Input bar */}
        {!chatFinished && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('screens.chat.inputPlaceholder')}
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              hitSlop={8}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.sendIcon}>➤</Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('screens.chat.feedbackTitle')}</Text>

            <StarRating rating={feedbackRating} onRate={setFeedbackRating} labels={ratingLabels} colors={colors} />

            <TextInput
              style={styles.feedbackInput}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder={t('screens.chat.feedbackPlaceholder')}
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={500}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setFeedbackVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalSubmitButton,
                  (feedbackRating === 0 || feedbackSubmitting) && styles.sendButtonDisabled,
                ]}
                onPress={submitFeedback}
                disabled={feedbackRating === 0 || feedbackSubmitting}
              >
                {feedbackSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('screens.chat.feedbackSubmit')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BUBBLE_RADIUS = 18;

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    // ─ List ─
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },

    // ─ Message rows ─
    messageRow: {
      marginBottom: spacing.sm,
      maxWidth: '80%',
    },
    messageRowUser: {
      alignSelf: 'flex-end',
    },
    messageRowAI: {
      alignSelf: 'flex-start',
    },

    // ─ Bubbles ─
    bubble: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      ...shadows.sm,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderTopLeftRadius: BUBBLE_RADIUS,
      borderTopRightRadius: BUBBLE_RADIUS,
      borderBottomLeftRadius: BUBBLE_RADIUS,
      borderBottomRightRadius: spacing.xs,
    },
    aiBubble: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BUBBLE_RADIUS,
      borderTopRightRadius: BUBBLE_RADIUS,
      borderBottomRightRadius: BUBBLE_RADIUS,
      borderBottomLeftRadius: spacing.xs,
    },
    bubbleText: {
      ...typography.body2,
    },
    userBubbleText: {
      color: colors.textInverse,
    },
    aiBubbleText: {
      color: colors.text,
    },
    timestamp: {
      ...typography.caption,
      marginTop: spacing.xs,
      fontSize: 10,
    },
    timestampUser: {
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'right',
    },
    timestampAI: {
      color: colors.textTertiary,
      textAlign: 'left',
    },

    // ─ Typing indicator ─
    typingRow: {
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    dotsContainer: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginRight: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    typingLabel: {
      ...typography.caption,
      color: colors.textTertiary,
    },

    // ─ Input bar ─
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    textInput: {
      flex: 1,
      ...typography.body2,
      color: colors.text,
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
      maxHeight: 120,
      minHeight: 40,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    sendButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    sendIcon: {
      color: colors.textInverse,
      fontSize: 18,
      fontWeight: '700',
    },

    // ─ Header ─
    headerAction: {
      ...typography.subtitle2,
    },

    // ─ Feedback modal ─
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    modalContent: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      ...shadows.lg,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },

    // Stars
    starsContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    starsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    starButton: {
      padding: spacing.xs,
    },
    starIcon: {
      fontSize: 36,
    },
    ratingLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },

    // Feedback input
    feedbackInput: {
      ...typography.body2,
      color: colors.text,
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: spacing.xl,
    },

    // Modal buttons
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalCancelButton: {
      flex: 1,
      height: 48,
      borderRadius: borderRadius.xl,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      ...typography.button,
      color: colors.textSecondary,
    },
    modalSubmitButton: {
      flex: 1,
      height: 48,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    modalSubmitText: {
      ...typography.button,
      color: colors.textInverse,
    },
  });
