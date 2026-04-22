/**
 * Lightweight funnel / screen logging. Wire to analytics backend or forward from infra.
 */
export function logScreen(name: string, params?: Record<string, unknown>) {
  if (__DEV__) {
    console.log('[analytics:screen]', name, params);
  }
}

export function logEvent(name: string, params?: Record<string, unknown>) {
  if (__DEV__) {
    console.log('[analytics:event]', name, params);
  }
}
