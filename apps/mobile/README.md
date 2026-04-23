# Mobile App (Expo React Native)

`apps/mobile` yatirimci odakli mobil istemcidir. Expo tabanlidir ve MarketPulse API'si ile haberlesir.

## Gereksinimler

- Node.js 20+
- Expo CLI (opsiyonel, `npx expo` da kullanilabilir)
- iOS Simulator veya Android Emulator (opsiyonel)

## Lokal Calistirma

```bash
cd /repo-root
npm ci
npm run dev --workspace=apps/mobile
```

## Platform Komutlari

```bash
npm run ios --workspace=apps/mobile
npm run android --workspace=apps/mobile
```

## Test ve Kalite

```bash
cd /repo-root
npm run lint --workspace=apps/mobile
npm run test --workspace=apps/mobile -- --runInBand
```

## Ortam Degiskenleri

- Uretim konfigurasyonu icin `env.production.example` dosyasini referans alin.
- API URL ve izleme tokenlari ortama gore tanimlanmalidir.

## Notlar

- API contract guncellemelerinde generated client dosyalari root'taki generate scriptleri ile yenilenmelidir.
