# ADR 0003: Realtime dagitimda Redis bridge + websocket manager

- Status: accepted
- Date: 2026-04-22

## Context

Tek node websocket yayini coklu instance ortamina dogrudan tasinamaz.
Fiyat akisi ve alarm olaylari tum bagli istemcilere tutarli ulasmali.

## Decision

- Uygulama ici baglanti yonetimi `ConnectionManager` ile yapilir.
- Dagitim katmani olarak Redis pub/sub bridge kullanilir.
- Websocket auth sadece `Authorization` header uzerinden kabul edilir.

## Consequences

- Multi-instance yayin tutarliligi saglanir.
- Redis bagimliligi kritik hale gelir (hazirlik/izleme gerekli).
