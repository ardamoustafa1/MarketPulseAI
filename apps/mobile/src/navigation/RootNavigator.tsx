import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';
import { View, ActivityIndicator, Pressable } from 'react-native';

import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
import { AuthNavigator } from './AuthNavigator';
import { AppTabNavigator } from './AppTabNavigator';
import { Text } from '../components/ui/Text';
import { usePortfolioStore } from '../store/usePortfolioStore';

const Stack = createNativeStackNavigator();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background.base,
    card: colors.background.surface,
    text: colors.text.primary,
  },
};

type BiometricGate = 'idle' | 'checking' | 'passed' | 'failed';

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, hydrate, logout } = useAuthStore();
  const [gate, setGate] = useState<BiometricGate>('idle');
  const pushRegisterOnce = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      return;
    }
    void usePortfolioStore.getState().hydratePortfolioContext();
    void usePortfolioStore.getState().fetchBuckets();
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      setGate('idle');
      pushRegisterOnce.current = false;
      return;
    }

    let cancelled = false;

    (async () => {
      if (!cancelled) setGate('checking');
      const lock = await SecureStore.getItemAsync('biometric_app_lock_enabled');
      if (lock !== 'true') {
        if (!cancelled) setGate('passed');
        return;
      }

      // Expo Go can be unstable with native biometric prompts; fail open in that env.
      if (Constants.appOwnership === 'expo') {
        if (!cancelled) setGate('passed');
        return;
      }

      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!has || !enrolled) {
          if (!cancelled) setGate('passed');
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock MarketPulse AI',
          fallbackLabel: 'Use passcode',
        });
        if (cancelled) return;
        setGate(result.success ? 'passed' : 'failed');
      } catch {
        // Never crash or lock users out if biometric API fails unexpectedly.
        if (!cancelled) setGate('passed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isAuthenticated || gate !== 'passed') {
      return;
    }
    if (Constants.appOwnership === 'expo') {
      // Expo Go has limited native notification support; skip registration there.
      return;
    }
    if (pushRegisterOnce.current) {
      return;
    }
    pushRegisterOnce.current = true;
    void (async () => {
      const pref = await SecureStore.getItemAsync('push_notifications_pref');
      if (pref === 'false') {
        return;
      }
      const mod = await import('../services/pushRegistration');
      await mod.registerPushTokenWithBackend();
    })();
  }, [isAuthenticated, gate]);

  const retryBiometric = async () => {
    setGate('checking');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MarketPulse AI',
        fallbackLabel: 'Use passcode',
      });
      setGate(result.success ? 'passed' : 'failed');
    } catch {
      setGate('passed');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base }}>
        <ActivityIndicator size="large" color={colors.accent.premium_gold} />
      </View>
    );
  }

  const biometricPending =
    isAuthenticated && (gate === 'idle' || gate === 'checking');

  if (biometricPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base }}>
        <ActivityIndicator size="large" color={colors.accent.premium_gold} />
        <Text variant="body" color={colors.text.secondary} style={{ marginTop: 16 }}>
          {gate === 'checking' ? 'Authenticating…' : 'Loading…'}
        </Text>
      </View>
    );
  }

  if (isAuthenticated && gate === 'failed') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background.base,
          padding: 24,
        }}
      >
        <Text variant="h3" weight="700" style={{ marginBottom: 8 }}>
          Unlock required
        </Text>
        <Text variant="body" color={colors.text.secondary} style={{ marginBottom: 24, textAlign: 'center' }}>
          Use Face ID, Touch ID, or your device passcode to continue.
        </Text>
        <Pressable onPress={retryBiometric} style={{ marginBottom: 12 }}>
          <View
            style={{
              backgroundColor: colors.text.primary,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Text color={colors.background.base} weight="700">
              Try again
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => void logout()}>
          <Text variant="body" color={colors.sentiment.bear_red} weight="600">
            Log out
          </Text>
        </Pressable>
      </View>
    );
  }

  const showApp = isAuthenticated && gate === 'passed';

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showApp ? (
          <Stack.Screen name="AppFlow" component={AppTabNavigator} />
        ) : (
          <Stack.Screen name="AuthFlow" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
