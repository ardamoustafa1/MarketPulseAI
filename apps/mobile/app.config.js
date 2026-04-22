/**
 * Dynamic Expo config: embeds EXPO_PUBLIC_* at build time and store listing fields.
 * Base values live in app.json; this file merges env-driven URLs.
 */
const appJson = require('./app.json');

const privacyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://YOUR_DOMAIN/privacy';
const termsUrl =
  process.env.EXPO_PUBLIC_TERMS_URL || 'https://YOUR_DOMAIN/terms';
const supportUrl =
  process.env.EXPO_PUBLIC_SUPPORT_URL || 'https://YOUR_DOMAIN/support';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    description:
      'Track crypto, forex, and metals. Portfolio, watchlist, alerts, and live prices in one place.',
    privacy: privacyUrl,
    ios: {
      ...appJson.expo.ios,
    },
    android: {
      ...appJson.expo.android,
    },
    extra: {
      ...(appJson.expo.extra || {}),
      privacyPolicyUrl: privacyUrl,
      termsUrl,
      supportUrl,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null,
    },
  },
};
