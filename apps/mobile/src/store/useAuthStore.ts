import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { wsClient } from '../ws/client';
import { apiClient } from '../api/client';
import { useMarketDataStore } from './useMarketDataStore';
import { identifyCrashUser } from '../monitoring/crashReporting';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  subscription_tier?: string;
  totp_enabled?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: { first_name?: string; last_name?: string; password?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // True while checking SecureStore on app boot

  login: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    set({ user, isAuthenticated: true });
    identifyCrashUser({ id: user.id });

    // Initialize WebSocket as soon as we have a valid session.
    // Never let WS boot failures crash auth flow (especially in Expo Go).
    try {
      wsClient.init();
      void wsClient.connect();
    } catch {
      /* keep session alive even if realtime socket boot fails */
    }
  },

  logout: async () => {
    useMarketDataStore.getState().resetRealtime();
    // 1. Tear down WebSocket BEFORE clearing tokens to prevent zombie connections
    wsClient.destroy();

    // 2. Unregister push token (best-effort)
    try {
      const pushTok = await SecureStore.getItemAsync('expo_push_token');
      if (pushTok) {
        await apiClient
          .delete('/api/v1/notifications/push-token', { data: { token: pushTok } })
          .catch(() => {});
      }
    } catch (_) {
      /* ignore */
    }
    await SecureStore.deleteItemAsync('expo_push_token');

    // 3. Attempt server-side logout (best-effort, don't block on failure)
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken) {
        await apiClient.post('/api/v1/auth/logout', { refresh_token: refreshToken }).catch(() => {});
      }
    } catch (_) {
      // Silent fail — we're logging out anyway
    }

    // 4. Clear all secure storage
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');

    identifyCrashUser(null);
    // 5. Reset state — this triggers RootNavigator to switch to AuthFlow
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        // Validate token by fetching user profile
        const { data } = await apiClient.get('/api/v1/users/me');
        set({ user: data, isAuthenticated: true, isLoading: false });
        identifyCrashUser({ id: data?.id });

        // Boot WebSocket for price feeds without risking hydrate crashes.
        try {
          wsClient.init();
          void wsClient.connect();
        } catch {
          /* keep session alive even if realtime socket boot fails */
        }
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch {
      // Token expired or invalid — clear everything and send to login
      useMarketDataStore.getState().resetRealtime();
      wsClient.destroy();
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshProfile: async () => {
    try {
      const { data } = await apiClient.get<User>('/api/v1/users/me');
      set({ user: data });
    } catch {
      // Keep existing user; screen can show stale state
    }
  },

  updateProfile: async (payload) => {
    const body: Record<string, string> = {};
    if (payload.first_name !== undefined) body.first_name = payload.first_name;
    if (payload.last_name !== undefined) body.last_name = payload.last_name;
    if (payload.password !== undefined && payload.password.length > 0) body.password = payload.password;
    const { data } = await apiClient.put<User>('/api/v1/users/me', body);
    set({ user: data });
  },
}));
