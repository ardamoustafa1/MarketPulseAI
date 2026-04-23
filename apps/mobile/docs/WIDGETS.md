# Home Screen Widgets (iOS + Android)

MarketPulse exposes a compact, public-per-user JSON payload that iOS and Android
home-screen widgets can consume without shipping a copy of the full mobile API
client:

```
GET /api/v1/portfolio/widget-snapshot
Authorization: Bearer <access_token>
```

Response:

```json
{
  "total_value_usd": "12847.32",
  "daily_change_pct": "+1.84",
  "featured_asset": {
    "symbol": "BTC",
    "name": "Bitcoin",
    "price_usd": "67421.15",
    "change_24h_pct": "+2.31"
  },
  "generated_at": "2026-04-23T13:42:00Z"
}
```

The endpoint is intentionally tiny so the widget can be refreshed on low
battery / cellular without impacting the main app's rate budget. Expect to
call it once every 15 minutes at most — that is the minimum iOS/Android allow
for widget timelines in practice.

---

## iOS (Swift / WidgetKit)

Because MarketPulse uses Expo managed workflow, adding a native widget
requires either (a) Expo Prebuild + a custom dev client, or (b) generating a
bare workflow under `apps/mobile/ios` manually.

Recommended path: **Expo config plugin + WidgetKit**.

### 1. Prebuild

```
cd apps/mobile
npx expo prebuild --platform ios
```

### 2. Add a WidgetKit Extension Target in Xcode

1. Open `ios/MarketPulse.xcworkspace`.
2. File → New → Target → Widget Extension. Name it `MarketPulseWidget`.
3. Add both the app and the widget target to the same App Group
   (`group.app.marketpulse.shared`). The app writes the snapshot payload to
   this App Group via `UserDefaults(suiteName:)`, and the widget reads it.

### 3. JS side: persist snapshot to the App Group

Add `react-native-shared-group-preferences` or a small custom native module.
On every app foreground call:

```ts
import { apiClient } from '@/api/client';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP = 'group.app.marketpulse.shared';

export async function refreshWidgetSnapshot() {
  const { data } = await apiClient.get('/api/v1/portfolio/widget-snapshot');
  await SharedGroupPreferences.setItem('widget_snapshot', JSON.stringify(data), APP_GROUP);
}
```

### 4. Widget side (Swift)

`TimelineProvider.getTimeline` reads the same App Group and builds the entries:

```swift
let defaults = UserDefaults(suiteName: "group.app.marketpulse.shared")
let raw = defaults?.string(forKey: "widget_snapshot")
let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: Data(raw!.utf8))
```

A medium-size widget template is included at
`apps/mobile/ios-widget-template/` (copy into your `MarketPulseWidget` target).
It renders the total value, the percentage pill, and the featured asset with
native SF Rounded typography + tabular numbers for a premium finish.

---

## Android (Jetpack Glance)

On Android use **Glance** (Jetpack Compose for widgets) after Expo prebuild:

```
npx expo prebuild --platform android
```

1. Create `android/app/src/main/java/app/marketpulse/widget/PortfolioWidget.kt`
   using Glance's `GlanceAppWidget`.
2. The JS side writes the same JSON payload to
   `getSharedPreferences("widget", Context.MODE_PRIVATE)` (use
   `@react-native-async-storage/async-storage` with the `native` bridge, or a
   small custom `ReactContextBaseJavaModule`).
3. Schedule a refresh every 15 minutes via `WorkManager`.

A Glance template is checked in at `apps/mobile/android-widget-template/`.

---

## Security & Privacy

- The widget payload never contains the user's private transactions, fees or
  notes — only aggregate USD value plus the best-performing symbol.
- Access tokens live in `SecureStore` / `Keychain` / `EncryptedSharedPreferences`
  just like the main app. The widget uses the same refresh flow (401 → refresh).
- The App Group / SharedPreferences value is encrypted-at-rest on iOS 14+ and
  Android 10+. For older OS versions, ship a minimal payload (total + featured
  only) as we do above.

---

## CI / Release Notes

When preparing a widget-enabled release:

1. `npx expo prebuild --clean` → rebuild native projects.
2. Run `eas build --platform ios --profile widgets` (profile defined in
   `apps/mobile/eas.json`).
3. Smoke test: add widget to home screen, force-close the main app, ensure
   payload refresh kicks in within 15 minutes.

The `/api/v1/portfolio/widget-snapshot` endpoint is covered by the backend
contract test suite (`apps/api/tests/integration/test_widget_snapshot.py` —
to be added in the widget release PR).
