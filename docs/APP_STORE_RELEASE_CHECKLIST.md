# App Store Release Checklist

## 1) Mobile Build Configuration

- [ ] `apps/mobile/app.json` bundle id is final (`com.marketpulse.ai` or your production id)
- [ ] `ios.buildNumber` incremented for each iOS submission
- [ ] `android.versionCode` incremented for each Android submission
- [ ] `apps/mobile/eas.json` production profile is used

## 2) Required Visual Assets (manual)

- [ ] App icon (1024x1024, no transparency) added and wired in Expo config
- [ ] Splash image/background added and wired in Expo config
- [ ] Adaptive icon (Android) added

## 3) Environment and Endpoints

- [ ] `EXPO_PUBLIC_API_URL` points to production HTTPS domain
- [ ] `EXPO_PUBLIC_WS_URL` points to production WSS endpoint
- [ ] Backend readiness endpoint returns `ready=true`
- [ ] Post deploy smoke passes: `infra/scripts/post_deploy_smoke.sh`

## 4) App Store Connect Metadata (manual)

- [ ] App name, subtitle, description filled
- [ ] Screenshots for required device sizes uploaded
- [ ] Privacy policy URL and support URL provided
- [ ] App Privacy questionnaire completed correctly
- [ ] Age rating and content rights declarations completed

## 5) Final Quality Gate

- [ ] Mobile tests pass
- [ ] Backend tests pass
- [ ] Crash reporting active in production
- [ ] Sentry DSN and release tags configured
- [ ] No mock data in production-facing flows
