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

## What is next

- Full integration/websocket/mobile e2e coverage buyutme
- SLO breach bazli otomatik release blokajlari
- Daha derin cost/perf optimizasyonu (cache strategy + query profiling)
