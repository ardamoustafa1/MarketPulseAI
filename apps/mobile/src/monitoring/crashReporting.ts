import Constants from 'expo-constants';

export function initializeCrashReporting() {
  const globalAny = global as any;
  const previousGlobalHandler = globalAny.ErrorUtils?.getGlobalHandler?.();

  if (globalAny.__marketpulse_crash_handler_installed__) {
    return;
  }

  const dsn =
    (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
      Sentry.init({
        dsn,
        sendDefaultPii: false,
        tracesSampleRate: 0.1,
      });
    } catch {
      /* Sentry native module not linked in this build */
    }
  }

  if (globalAny.ErrorUtils?.setGlobalHandler) {
    globalAny.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.error('[crash-report]', {
        message: error?.message,
        stack: error?.stack,
        isFatal: Boolean(isFatal),
      });

      if (dsn) {
        try {
          const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
          Sentry.captureException(error);
        } catch {
          /* noop */
        }
      }

      if (typeof previousGlobalHandler === 'function') {
        previousGlobalHandler(error, isFatal);
      }
    });
  }

  globalAny.__marketpulse_crash_handler_installed__ = true;
}
