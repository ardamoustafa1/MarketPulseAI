# ADR 0001: API ve worker proseslerini ayirma

- Status: accepted
- Date: 2026-04-22

## Context

Tek proses icinde hem HTTP hem scheduler calistirmak:
- olceklenebilirlikte duplicate scheduler riskine,
- noisy-neighbor etkisine,
- operasyonel ayristirma zorluguna neden oluyordu.

## Decision

Uygulama rolleri `APP_ROLE` ile ayrildi:
- `api`: HTTP + websocket bridge
- `worker`: scheduler + alert evaluator + job worker

Docker compose tarafinda `api` ve `api_worker` ayrik servisler olarak konumlandi.

## Consequences

- Artan operasyonel netlik ve yatay olcekte daha guvenli scheduler davranisi.
- Dagitim karmasikligi bir miktar artis (ek servis yonetimi).
