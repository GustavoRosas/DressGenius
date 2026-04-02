/**
 * DressGenius — Push Notification Service (#28)
 *
 * Gerencia registro de push token, envio ao backend e handlers de notificação.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from '../api/client';

/** Configura comportamento padrão de notificação em foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permissão e retorna o Expo push token.
 * Retorna `null` se não for possível obter (emulador, permissão negada).
 */
export async function registerForPushNotifications(): Promise<string | null> {
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

/** Callback para notificação recebida em foreground */
export type NotificationReceivedCallback = (
  notification: Notifications.Notification,
) => void;

/** Callback para tap em notificação */
export type NotificationResponseCallback = (
  response: Notifications.NotificationResponse,
) => void;

/**
 * Registra listeners de notificação.
 * Retorna função de cleanup para remover os listeners.
 */
export function setupNotificationHandlers(
  onReceived?: NotificationReceivedCallback,
  onTap?: NotificationResponseCallback,
): () => void {
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
}
