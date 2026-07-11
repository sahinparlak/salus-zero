# Gün 3 — Skor Ağırlıkları Onay Listesi (Dr. Şahin Parlak)

> **Statü: ✅ ONAYLANDI — Dr. Şahin Parlak, 8 Temmuz 2026 (Gün 4 açılışı).**
> Kararlar: madde 1-4, 6, 9 **yazıldığı gibi onaylandı** (bantlar + t=KARAR
> anı semantiği dahil; transfer-hazırlığı puanı P1'e park). Madde 5:
> **ek kesinti eklendi** — sevk, `history_exam` / `reexamine_observe` /
> `glucose_ketone`'un HİÇBİRİ yapılmadan commit edilirse disiplinden −10
> (tek sefer; "kör sevk" artık 85 değil 75 alır; kısmi çalışma tetiklemez —
> `scoringSignals.blindCommitPenalty`, motor domain-agnostik kaldı).
> *Gün 4 inceleme düzeltmesi:* `reexamine_observe` listeye eklendi — seri
> muayene de yatak başı değerlendirmedir; yoksa skor satırı ("hiç muayene
> yok") kayıt günlüğüyle ("Re-examine / observe, dk 0") çelişebiliyordu.
> Şahin'in vetosuna açık.
> Madde 7+8 tek hamlede: **muayene ayırıcıya 3p girdi, CBC ayırıcıdan
> çıktı** (sipariş edilebilir + PAS anlatısında yaşamaya devam ediyor);
> yan etki olarak 100 artık ulaşılabilir (15+5+30+25 = 75 dk ≤ 90).
> Skor aritmetiği tamamen KODDA; model sayı seçmiyor, sadece öğreten
> metni yazıyor. Jüri "neden 73?" derse cevap satır satır ekranda.
> Aşağıdaki orijinal taslak, tarihçe olarak korunuyor.

## Skorun iskeleti (toplam 100)

| Eksen | Puan | Menteşe |
|---|---|---|
| **1 · Sevk zamanlaması** | **60** | Vakanın tezi: tek belirleyici sayı |
| **2 · Kaynak disiplini** | **25** | Olmayanı kovalamamak |
| **3 · Ayırıcı tanı çalışması** | **15** | Eldeki ucuz testlerle mimik dışlama |

Tartışmalı klinik tarz (hangi antibiyotik, sıvı stratejisi, analjezi
zamanlaması) **asla puanlanmıyor** — roadmap kuralı, değişmedi.

## A · Karar gerektirenler

1. **Sevk zamanlaması bantları:** t ≤ 90 dk → 60/60 (kapsayıcı). Sonrası,
   karar anında hastanın bulunduğu EVREYE göre bant: S0'da geç sevk → 50 ·
   S1 → 37 · S2 → 23 · S3 → 10 · hiç sevk yok (saat 600'de doldu) → 0.
   Gerekçe: "yalancı rahatlama penceresinde sevk ettin" cümlesi klinik
   olarak savunulabilir; dakika-bazlı lineer eğri savunulamaz.
   **Dikkat: 90→91. dakika arası 10 puanlık uçurum var** (60→50).
   Bant felsefesi ve sayılar onaylı mı?
   **⚠️ İnceleme sonrası semantik düzeltmesi (onayını istiyor):** t artık
   doktorun KARAR anı (commit tıklamasındaki görünen saat), telefonun
   bittiği an değil. Eski haliyle gerçek eşik gizlice 75. dakikaya iniyordu
   ve sevkle aynı tura bağlanan sıvı/antibiyotik zamanlama puanı yakıyordu —
   vaka tam tersini öğretiyor. Karar anı mı, çağrı-bitişi mi?
2. **Tekrar isteği cezası −5:** CT/USG'yi BİR kez istemek bedava (sormak
   doğaldır; oyun içinde zaten telefon dakikası yakıyor). Aynı kaynağın her
   TEKRARI −5. Onaylı mı?
3. **Bekleme tuzağı cezası −15:** "Sabah sonografçıyı bekle" (+300 dk)
   aksiyonunun HER seçimi −15 (disiplin 25'in %60'ı). "İstemek bedava,
   beklemek pahalı" hiyerarşisi doğru mu?
4. **Ayırıcı tanı kredileri (ilk istekte bir kez):** glukoz+keton 6 (DKA
   dışlama = odadaki en ucuz hayat kurtaran test) · idrar 3 (İYE) ·
   grafi 3 (konstipasyon/bazal pnömoni) · CBC 3 (enflamatuar gidişat).
   Dağılım ve glukozun primatı onaylı mı?
   > **↳ GÜNCELLEME 2026-07-11 (Dr. Şahin):** DKA ayırıcıdan tamamen çıkarıldı.
   > Emekliye ayrılan glukoz kredisi (6) → **anamnez & muayene (3→9)**; idrar 3,
   > grafi 3 sabit; toplam yine 15. Güncel dağılım kodda ve GUN1-KLINIK-ONAY.md
   > EK'inde. Aşağıdaki 5. maddedeki "glukoz yokluğu" ifadesi artık "muayene
   > yokluğu" olarak okunmalı (kör-taahhüt kapısı = `[history_exam, reexamine_observe]`).
5. **⚠️ En sert vaka: sıfır muayene + anında sevk = 85 puan.** Hiç dokunmadan,
   hiç test istemeden 15. dakikada zinciri başlatan oyuncu 60+25+0=85 alır
   (ayırıcı tanının 15'ini kaybeder, başka ceza yok). Tez "erken taahhüt HER
   ŞEYDİR" olduğu için bilinçli — ama jüride "muayenesiz sevke 85 mi?"
   sorusu gelebilir. Debrief metni bu boşluğu yakalayıp öğretiyor (model
   kaçırılan DKA dışlamasını "miss" olarak yazar). Sayı sende: 85 kalsın mı,
   muayene/glukoz yokluğuna ayrı bir kesinti mi eklensin?
6. **Ambulans yolculuğu skora girmiyor:** Vaka sevk-başlatmada bitiyor;
   240 dk'lık varış süresi skoru etkilemiyor (etkisi zaten referTargetByMin
   90'ın içine gömülü). Onaylı mı?
7. **Muayene hiç puanlanmıyor (inceleme bulgusu):** Hiç dokunmayan oyuncu
   ayırıcı-tanı 15'i dışında hiçbir şey kaybetmiyor; gastroenterit mimiği
   (anamnez + seri muayene ile dışlanır) için ayırıcı kredisi de yok.
   Seçenek: `history_exam`'e ayırıcı kredisi ver (ör. muayene 3, CBC 3→0
   veya dağılımı yeniden kur) ya da bilinçli bırak. Kararın?
8. **100 matematiksel olarak ulaşılamaz (max 97):** 4 test + sevk seri
   olarak 90 dakikaya sığmıyor (5+30+25+40+15=115 dk). Seçenekler:
   (a) CBC'yi ayırıcı listeden çıkar (PAS bileşeni zaten anlatıda yaşar),
   (b) hedefi kaydır, (c) bilinçli bırak — "bu gecede mükemmel yok"
   tematik olarak güçlü. Kararın?
9. **Transfer-hazırlığı (sıvı/antibiyotik/NPO) puanlanmıyor:** Vakanın kendi
   hedef metni "stabilize et + (protokole göre) antibiyotik + yola çıkar"
   diyor ama 240 dk yolculuğa hazırlığın skor karşılığı yok. Not: antibiyotik
   kararını skor ekseni YAPMA kuralın duruyor — bu yüzden P1/Gün-4 adayı
   olarak öneriyorum, bugün değil. Katılıyor musun?

## B · Bilgi (karar istemez)

- Skor bantları evre TABLOSUNDAN türetiliyor (S sayısı değişirse bantlar
  kendini ayarlar) — motor domain-agnostik kaldı; DKA vakası kendi
  `scoringSignals`'ını getirecek.
- Debrief çağrısı: tek structured-output (`json_schema`), effort high,
  model yalnız {reveal, strengths, misses, resourceLesson} yazıyor; skor +
  satır satır dökümü + ctContrast (senin onayladığın paragraf, kelimesi
  kelimesine) worker'dan gidiyor.
- Canlı testte (2026-07-08 gecesi) örnek gerçek çıktı: 120. dk'da sevk
  kararı → 77/100 (zamanlama 37/60 + disiplin 25/25 + ayırıcı 15/15);
  debrief "sonuçlar 20. dakikada elindeydi, telefon 120'de kalktı — o
  arada hasta S1'e ilerledi" ince hatasını kendiliğinden yakaladı.
  Felaket oyun (sabah USG tuzağı + çift CT ısrarı + hiç sevk) → 5/100.

*— Hazırlayan: Claude, Gün 3 gecesi · Skor koddadır, söz modeldedir.*
