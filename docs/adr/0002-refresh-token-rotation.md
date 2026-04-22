# ADR 0002: Refresh token rotation zorunlulugu

- Status: accepted
- Date: 2026-04-22

## Context

Uzun omurlu tokenlarin sizmasi durumunda hesap ele gecirme etkisi yuksek.
Sabit refresh token kullanimi replay riskini buyutuyor.

## Decision

- Access token TTL kisa tutuldu (`ACCESS_TOKEN_EXPIRE_MINUTES=15`).
- Her refresh isteginde onceki refresh token revoke edilip yeni cift uretiliyor.
- Token cevabinda refresh policy metadata'si donuluyor.

## Consequences

- Cihaz/surumler token yenilemeyi dogru yonetmek zorunda (istemci disiplini gerekiyor).
- Kompromize token etkisi pencere bazinda belirgin sekilde kisaliyor.
