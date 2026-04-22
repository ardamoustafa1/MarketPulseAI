# MarketPulse AI Case Study

## Problem

Perakende yatirimci tarafinda uc temel aci vardi:
- Parcalanmis veri kaynaklari sebebiyle gecikmeli fiyat ve dusuk guven.
- Portfoy performansini aksiyona donusturen sade bir operasyon paneli eksikligi.
- Guvenlik ve operasyon olgunlugu gorunurlugunun dusuk olmasi.

## Product goal

Gercek zamanli piyasa verisi, portfoy analizi ve operasyonel admin kabiliyetini tek platformda birlestirmek.

## Metrics (target-oriented)

- Onboarding activation rate: `%25 -> %45`
- First value time (ilk islemden ilk icgoruye): `<10 dk`
- API P95 latency: `<300ms` (core endpoints)
- Release failure rate: `<5%`

## Key technical trade-offs

- **Redis pub/sub + websocket bridge** yerine full event bus secilmedi:
  - Kazanc: hizli kurulum ve dusuk operasyon maliyeti
  - Bedel: Redis bagimliligi kritikligi artti
- **Short-lived access token + rotation**:
  - Kazanc: kompromize token etkisini kisaltma
  - Bedel: istemci tarafi oturum yenileme karmasikligi
- **Worker/process ayrimi**:
  - Kazanc: scheduler duplicate riskinin dusmesi
  - Bedel: deployment topolojisinin karmasiklasmasi

## Outcomes (current state)

- Admin panel read-only demodan canli operasyon paneline gecis yapti.
- Security gate CI icinde merge oncesi fail-fast modeline baglandi.
- Incident response akisi (rotate + revoke) dokumante ve scriptlesmis durumda.

## Before / after metrics dashboard

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Admin critical flow automated tests | 1 | 3+ | +200% |
| End-to-end gates in CI | 0 | admin+api+mobile smoke | coverage introduced |
| Security enforcement docs | checklist-only | baseline + checks matrix | governance formalized |
| Deploy maturity | image publish only | staging+production staged flow + rollback drill | production ownership signal |
| Perf evidence | none | k6 thresholded smoke suite | scalability proof path |

## Experiment log (product + engineering)

1. **Session hardening experiment**
   - Hypothesis: HttpOnly cookie + CSRF will reduce token exfiltration risk surface.
   - Result: Admin auth moved from LocalStorage token transport to cookie transport.
2. **Release gate experiment**
   - Hypothesis: SLO + funnel thresholds reduce bad-release probability.
   - Result: CI includes release gate check script wired to staging deploy.
3. **Perf confidence experiment**
   - Hypothesis: Thresholded perf smoke catches latency regressions earlier.
   - Result: k6 suite added with p95 and error-rate thresholds.

## What is next

- Full integration/websocket/mobile e2e coverage buyutme
- SLO breach bazli otomatik release blokajlari
- Daha derin cost/perf optimizasyonu (cache strategy + query profiling)
