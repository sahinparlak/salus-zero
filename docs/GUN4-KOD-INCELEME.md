# Gün 4 — Kod İncelemesi & Canlı Test Kaydı (8 Temmuz 2026, gece)

> Gün 4 diff'i (drift + skor kararları + red-kanalı + onay şeridi +
> localStorage + dakika damgaları) üzerinde 6-lens adversarial inceleme:
> **20 ajan, 14 bulgu, 12 doğrulandı, 2 çürütüldü** (wf_a37103f0). İki lens
> aynı iki ciddi hatayı bağımsız yakaladı. Ayrıca 2 canlı E2E oyunu
> (100/100 mükemmel yol + 36/100 tuzak yolu) üç ek hata çıkardı.
> Hepsi aynı gece düzeltildi ve 57-kontrollük batarya ile doğrulandı.

## Uygulanan düzeltmeler

| # | Bulgu | Düzeltme |
|---|---|---|
| 1 | **(ciddi)** `drift` alanı `toPublicCase`'ten sızıyordu — pain'in tek "step" olması yalancı-rahatlama uçurumunu network sekmesine ele veriyor | `toPublicCase` `drift`'i soyar; `precision` panellere kalır. Batarya + dist grep kontrolü eklendi |
| 2 | **(ciddi)** Bağlantı-kopuğu-notu tek başına kalan world girdisi replay'de ""e soyulup her turda 400 → gece kilitleniyor; localStorage kilidi ölümsüzleştiriyordu | Turn + debrief history'si artık ham metne değil `historyText()` çıktısına göre filtreleniyor |
| 3 | **(ciddi)** Bitmiş gece açılışta geri yüklenip reveal'ı spoilliyordu (veya açılışta başıboş debrief çağrısı ateşliyordu) | `loadStoredSession` caseOver oturumu düşürüp anahtarı siler — açılış her zaman karşılama ekranı |
| 4 | TempC "37.9→38→38.1" ondalık titremesi (altın yol dakika 50'de tam üstüne geliyor) | Paneller + prompt `toFixed(precision)` — "38.0" sabit; model ve monitör aynı yazımı kullanır |
| 5 | "Not yet" kapatması yenilemeyle diriliyordu | Kapatma `sim.pendingReferral`'ı da temizler (persist'e yansır) |
| 6 | Kör-sevk satırı `reexamine_observe` ile çelişiyordu ("hiç muayene yok" vs günlükte "Re-examine, dk 0") | `anyOf`'a `reexamine_observe` eklendi (seri muayene = yatak başı değerlendirme) — Şahin vetosuna açık |
| 7 | Log pencere uyumsuzluğu: turn keep-newest(200) vs debrief keep-oldest(200) — spam gecede erken muayene kanıtı silinip kör-sevk yanlış tetiklenebilir | turn.ts de keep-oldest(200) — skor semantiğiyle hizalı |
| 8 | Debrief promptu client damgalı `[minute N]`'e "koddan, güvenilir" diyordu | Dil yumuşatıldı: "uygulamanın eklediği ipucu; kod kaydı kazanır" |
| 9 | "→ " ile başlayan yazılmış metin replay'den düşüyordu (sentinel çakışması) | `TranscriptEntry.typed` alanı — replay veriden kurulur, prefix'ten değil |
| 10 | Bozuk storage değeri açılışta crash-loop yapabilir (çürütüldü ama zırh ucuz) | `loadStoredSession` yapısal doğrulama: `elapsedMin` sayı, `orderedLog` dizi, `debrief.axes` dizi |

## Canlı E2E'nin yakaladıkları (inceleme dışı)

| # | Bulgu | Düzeltme |
|---|---|---|
| 11 | **`x-salus-state` mojibake:** header'a bugün giren `reason` em-dash taşıyor; HTTP header'ları latin-1 → "â" bozulması + ayna sapması | Header JSON'ı `\uXXXX` ASCII-escape (JSON.parse şeffaf geri açar) |
| 12 | **Pending-sevk anlatı taşması:** niyet söylenince model telefonu açılmış gibi "yatak aranıyor" anlattı (kod: chain NOT started) | Kod-sahipli sevk durum satırına pending notu: "niyet dile geldi, sistemden geçmedi — hazırlık anlat, çağrı/ambulans asla" |
| 13 | **Debrief kuyruk artefaktı** (3 çağrının 2'sinde, hep son alanda): "cost.on on on the pathway…", "…after it.eq", "suspicion.this" | `looksGarbled()` kalite kapısı: üçlü-tekrar / nokta+kırpık kuyruk / yapışık-nokta imzasında **bir** retry; ikinci deneme her hâlükârde servis edilir (asla bloklamaz). Prompt'a temiz-bitiş kuralı da eklendi |

## Kabul edilen kalıntılar

- 5 dakikalık konuşma-turu monitörü kımıldatmayabilir (S0'da en büyük tik
  aralığı 7.5 dk) — video emir turlarından geçiyor; gerekirse senaryoyu ona
  göre yaz. Kod değişikliği yok.
- Deploy sırasında açık kalan eski sekmenin history sapması — sekmeyi
  kapat/yenile yeter (çürütülen bulgu; StoredSession zaten bugün doğdu).
- Forged-payload = kendi oyununu bozmak (Gün 2'den beri bilinen kalıntı).

## Doğrulama

- Batarya **57/57** (drift çapaları/orta-nokta/step/precision, kör-sevk
  aç/kapa/reexamine, 100-ulaşılabilir, bantlar, red-kanalı, `toPublicCase`
  drift-yok, pending kuralı, artefakt kapısı imzaları).
- `tsc` + `vite build` temiz; dist'te `drift` 0, tanı string'i 0.
- Canlı: /api/case drift'siz ✓ · header em-dash sağlam ✓ · pending-sevk
  anlatısı "chain not opened" diyor ✓ · kapılı debrief 20 sn'de temiz ✓.
- Canlı E2E: mükemmel yol **100/100** (misses boş — model övgü/eleştiri
  uydurmadı) · tuzak yolu **36/100** (23+10+3; debrief yalancı-rahatlama
  yanılgısını ve dk-30 bekleme kararını dakika atıflarıyla yakaladı).

*— Hazırlayan: Claude, Gün 4 gecesi · wf_a37103f0 (20 ajan, 847k token) +
2 canlı oyun · Skor koddadır, söz modeldedir.*
