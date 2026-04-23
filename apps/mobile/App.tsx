import './src/i18n';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { initializeCrashReporting, addCrashBreadcrumb } from './src/monitoring/crashReporting';
import { initializeAppLanguage } from './src/i18n';
import { useAppearance, useAppearanceSync } from './src/theme/appearance';
import { useMarketDataStore } from './src/store/useMarketDataStore';

// `react-native-performance` requires a native module that is NOT part of Expo Go.
// Use a lazy, defensive require so the import never crashes launch when the native
// module is missing (Expo Go / Jest / web). Falls back to `performance` / `Date.now`.
type PerfLike = {
  mark?: (name: string) => void;
  measure?: (name: string, start: string, end: string) => void;
  getEntriesByName?: (name: string) => Array<{ duration: number }>;
};
let perf: PerfLike | null = null;
try {
  const mod = require('react-native-performance');
  perf = (mod?.default ?? mod) as PerfLike;
} catch {
  perf = null;
}
function perfMark(name: string) {
  try { perf?.mark?.(name); } catch { /* noop */ }
}
function perfMeasure(name: string, start: string, end: string): number | null {
  try {
    perf?.measure?.(name, start, end);
    const entries = perf?.getEntriesByName?.(name) ?? [];
    const duration = entries[0]?.duration;
    return typeof duration === 'number' ? duration : null;
  } catch {
    return null;
  }
}

const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo) {
  initializeCrashReporting();
}
perfMark('app_js_start');

export default function App() {
  useEffect(() => {
    void initializeAppLanguage();
    if (!isExpoGo) {
      void useMarketDataStore.getState().hydrateFromCache();
    }
    perfMark('app_ready');
    const coldMs = perfMeasure('app_cold_start', 'app_js_start', 'app_ready');
    if (!isExpoGo && coldMs !== null) {
      addCrashBreadcrumb('perf', 'cold_start', { ms: Math.round(coldMs) });
    }
  }, []);

  useAppearanceSync();
  const resolved = useAppearance((s) => s.resolved);

  return (
    <SafeAreaProvider>
      <StatusBar style={resolved === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
