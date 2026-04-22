import './src/i18n';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { initializeCrashReporting } from './src/monitoring/crashReporting';
import { initializeAppLanguage } from './src/i18n';

initializeCrashReporting();

export default function App() {
  useEffect(() => {
    void initializeAppLanguage();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
