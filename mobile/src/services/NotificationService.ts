/**
 * DressGenius — Push Notification Service (#28)
 *
 * Gerencia registro de push token, envio ao backend e handlers de notificação.
 * Gracefully degrades in Expo Go (where expo-notifications is not supported since SDK 53).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../api/client';

// Detect Expo Go (notifications not supported since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load notifications module (crashes on import in Expo Go)
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[Notifications] Module load failed:', e);
  }
}

/**
 * Solicita permissão e retorna o Expo push token.
 * Retorna null em Expo Go ou se permissão negada.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) {
    console.warn('[Notifications] Not available (Expo Go or module missing).');
    return null;
  }

  try {
    if (!Device.isDevice) {
      console.warn('[Notifications] Push notifications require a physical device.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Android: canal padrão
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DressGenius',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6D28D9',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });

    return tokenData.data;
  } catch (e) {
    console.warn('[Notifications] Registration failed:', e);
    return null;
  }
}

/**
 * Envia o push token pro backend.
 */
export async function sendTokenToBackend(token: string): Promise<void> {
  await api.post('/device-tokens', {
    token,
    platform: Platform.OS,
  });
}

/** Callback types */
export type NotificationReceivedCallback = (notification: any) => void;
export type NotificationResponseCallback = (response: any) => void;

/**
 * Registra listeners de notificação.
 * Retorna função de cleanup. No-op em Expo Go.
 */
export function setupNotificationHandlers(
  onReceived?: NotificationReceivedCallback,
  onTap?: NotificationResponseCallback,
): () => void {
  if (!Notifications) {
    return () => {};
  }

  try {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        onReceived?.(notification);
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        onTap?.(response);
      },
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  } catch (e) {
    console.warn('[Notifications] Handler setup failed:', e);
    return () => {};
  }
}
