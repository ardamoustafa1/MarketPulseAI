# Admin App (React + Vite)

`apps/admin` operasyon ve yonetim panelidir. API ile konusur ve admin kullanicilarina kontrol ekranlari sunar.

## Gereksinimler

- Node.js 20+
- API'nin lokal veya remote calisiyor olmasi

## Lokal Calistirma

```bash
cd /repo-root
npm ci
npm run dev --workspace=apps/admin
```

Varsayilan adres: `http://localhost:5173`

## Build ve Test

```bash
cd /repo-root
npm run lint --workspace=apps/admin
npm run test --workspace=apps/admin
npm run build --workspace=apps/admin
```

## Ortam Degiskenleri

- Baslangic icin `.env.example` dosyasini kopyalayin.
- API taban URL degeri ortama gore set edilmelidir.

## Sorun Giderme

- API erisim hatalarinda once backend readiness endpoint'ini kontrol edin.
- Tip/generate uyumsuzlugunda root seviyesinde `npm run generate:api-types` calistirin.
