# Priority Action Plan

## J) Ilk 7 adim (oncelik sirali)

1. **P0** Exposed secret incident response: rotate + revoke + secret scan zorunlulugu.
2. **P0** CORS/token/session ayarlari: production-grade config ve dokuman hizasi.
3. **P0** Scheduler'i API prosesinden ayirip tekil worker/leader modelini standardize et.
4. **P0** Admin panelde mock katmanlarini tamamen kaldirip kritik ekranlari canli veriyle bitir.
5. **P1** CI icine guvenlik + bagimlilik taramalarini fail-fast gate olarak bagla.
6. **P1** Integration + websocket + mobile flow test kapsamini buyut.
7. **P1** Metrik/tracing/alerting kur; SLO bazli release kriteri ile merge/release gate tanimla.

## Bu projeyi ust seviyeye tasiyacak kritik 5 gelistirme

1. Secret yonetimini profesyonellestirme (rotate + scan + policy).
2. Admin paneli gercek operasyon aracina donusturme (mock'suz).
3. Scheduler/ingestion mimarisini olceklenebilir worker modeline tasima.
4. Guvenlik konfiglerini production-grade standarda kilitleme.
5. CI + gozlemlenebilirlik + test ucunu release gate'e baglama.

## Mevcut durum ozeti

- 1, 3, 4, 5 icin temel altyapi ve/veya ilk versiyon hayata gecmis durumda.
- 2 ve 6-7 icin kapsam buyutme ve otomasyon sertlestirme adimlari devam edecek.
