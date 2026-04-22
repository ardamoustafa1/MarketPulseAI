# Project hardening and UX uplift

## Problem
- Contributor onboardingi cok adimliydi, demo ortami tek komutta kurulmuyordu.
- Teknik kararlarin tarihcesi daginikti.
- Release notu disiplini zorunlu degildi.

## Change
- ADR klasoru ve ilk karar kayitlari eklendi.
- Tek komut local bootstrap ve idempotent seed script eklendi.
- CI tarafina coverage artifact ve release notes kontrol gate'i eklendi.

## Risk / Trade-off
- CI suresi bir miktar artar.
- Release notu zorunlulugu PR akisina ek disiplin getirir.

## Validation
- Backend route testleri ve admin build ile temel dogrulama yapildi.
- Seed script idempotent sekilde tekrar calistirilabilir tasarlandi.
