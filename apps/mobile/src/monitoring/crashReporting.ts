import Constants from 'expo-constants';
import * as Application from 'expo-application';

// Lazy require wrapper so the absence of the native Sentry module never breaks boot.
type SentryModule = typeof import('@sentry/react-native');
let cachedSentry: SentryModule | null | undefined;
function getSentry(): SentryModule | null {
  if (cachedSentry !== undefined) return cachedSentry;
  try {
    cachedSentry = require('@sentry/react-native') as SentryModule;
  } catch {
    cachedSentry = null;
  }
  return cachedSentry;
}

function resolveDsn(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;
  return fromExtra || process.env.EXPO_PUBLIC_SENTRY_DSN || null;
}

function resolveRelease(): string {
  const version = Constants.expoConfig?.version || Application.nativeApplicationVersion || '0.0.0';
  const build =
    Application.nativeBuildVersion ||
    (Constants.expoConfig as { ios?: { buildNumber?: string }; android?: { versionCode?: number } } | undefined)?.ios?.buildNumber ||
    '1';
  return `marketpulse-mobile@${version}+${build}`;
}

function resolveEnvironment(): string {
  return (
    process.env.EXPO_PUBLIC_ENVIRONMENT ||
    (Constants.expoConfig?.extra as { environment?: string } | undefined)?.environment ||
    (__DEV__ ? 'development' : 'production')
  );
}

export function initializeCrashReporting() {
  const globalAny = global as unknown as {
    __marketpulse_crash_handler_installed__?: boolean;
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (fn: (error: Error, isFatal?: boolean) => void) => void;
    };
  };
  const previousGlobalHandler = globalAny.ErrorUtils?.getGlobalHandler?.();
  if (globalAny.__marketpulse_crash_handler_installed__) return;

  const dsn = resolveDsn();
  if (dsn) {
    const Sentry = getSentry();
    if (Sentry) {
      try {
        Sentry.init({
          dsn,
          sendDefaultPii: false,
          tracesSampleRate: 0.1,
          release: resolveRelease(),
          environment: resolveEnvironment(),
          enableAutoSessionTracking: true,
        });
      } catch {
        /* Sentry native module not linked in this JS build */
      }
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
        const Sentry = getSentry();
        try {
          Sentry?.captureException(error);
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

export function identifyCrashUser(user: { id?: string; email?: string | null } | null) {
  const Sentry = getSentry();
  if (!Sentry) return;
  try {
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    // Email is not PII-sensitive if user consents; omit to stay conservative.
    Sentry.setUser({ id: user.id || undefined });
  } catch {
    /* noop */
  }
}

export function addCrashBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
  const Sentry = getSentry();
  if (!Sentry) return;
  try {
    Sentry.addBreadcrumb({ category, message, data, level: 'info' });
  } catch {
    /* noop */
  }
}
