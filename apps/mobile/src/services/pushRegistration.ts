import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { apiClient } from '../api/client';

const PUSH_TOKEN_KEY = 'expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, registers Expo push token with the API, stores token locally for logout cleanup.
 */
export async function registerPushTokenWithBackend(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    );
    const token = tokenRes.data;
    const prev = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (prev && prev !== token) {
      await apiClient.delete('/api/v1/notifications/push-token', { data: { token: prev } }).catch(() => {});
    }

    await apiClient.post('/api/v1/notifications/push-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS,
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export async function unregisterPushFromBackend(): Promise<void> {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (token) {
    await apiClient.delete('/api/v1/notifications/push-token', { data: { token } }).catch(() => {});
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}
