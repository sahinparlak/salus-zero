# BÖLÜM 2 (CONSULT COMPANION) — EKSİK ANALİZİ

> 10 Tem gece, `6606d25` sonrası durum değerlendirmesi. Şahin'in sorusu üzerine
> ("nereler eksik?") yapılan dürüst envanter. Amaç: bu hafta yapılacakları,
> Gün-5 README yol haritasına girecek dürüst cümleleri ve post-hackathon
> sırasını TEK yerde tutmak.
>
> Etiketler: **[BU-HAFTA]** yapılır · **[README]** Gün-5'te yol-haritası cümlesi
> olur · **[POST-HACKATHON]** sonraya · **[KARAR]** Şahin imzası gerekir.

---

## 1. En büyük eksik: güvenlik hâlâ "iddia", henüz "kanıt" değil **[BU-HAFTA — Gün-3]**

Raylar tasarlandı (yalancı-rahatlamaya çözmeme, doz reddi, scope reddi,
injection zırhı, aile yönlendirmesi, yaş rayı) ama sistematik düşmanca
zorlama yapılmadı — yalnız nokta testleri var. "Güvenli olduğunu söyleyen
araç" ile "güvenliği denenmiş araç" arasındaki fark ürünün kimliği.

**Aksiyon:** Gün-3 klinik red-team = `docs/GUN3-RED-TEAM.md` (18 senaryo,
A1-G4). Bu geceden eklenen iki kontrol:
- İki kontrat işaretinin uyumu ~10 üretimde ("Confirm:" satırı + mimik
  "Ad — test" ayracı) — uyum kötüyse cümleler BAĞIMSIZ geri alınabilir.
- Skor **bileşen-tanıma** kontrolü: toplama doğru olsa bile bileşen atlanabiliyor
  (canlıda görüldü: "will not eat" bir üretimde anoreksi sayılmadı → PAS 7 vs 8).

## 2. "GROUNDED" yazıyor ama kanıt gösterilmiyor **[✅ YAPILDI — 10 Tem gece]**

~~Mavi GROUNDED nabzı şu an bir iddia.~~ **Yapıldı (P1-5 + domain-kütüphanesi
vitrini BİRLEŞTİ; workflow wf_aa760ef6 hakem kararı):** GROUNDED pill artık
tıklanabilir → kanıt kartı: Grounding (Source: H&A 8e Ch. 40 / Validated:
Dr. Şahin Parlak, satır satır / Boundary: "answers from this document only")
+ The library (kuzey-yıldızı cümlesi serif + raf: "01 · Pediatric appendicitis
— validated · v1" yanan, "02 · Next domain — coming · expert-authored" kesikli
ETKİLEŞİMSİZ konum) + "Never a free-text upload" dürüstlük cümlesi.
Kural: kesikli satıra ASLA "+", "add" fiili veya tıklanabilirlik eklenmez.
Referans dosyasına REFERENCE VERSION v1 başlığı eklendi (UI iddiası denetlenebilir).
Demo notu: sunucu kartı "why can it say that?" vuruşunda BİR KEZ açar, açık bırakır.

## 3. Enstrümanlar anlık, hafızasız **[KARAR → sonra POST-HACKATHON ya da boşta P1]**

Skor metresi ve worklist mesajın içinde yaşıyor; yeni sonuçla PAS güncellenince
eski skor yukarı kayıp gidiyor. Cevap: kalıcı skor rayı (yapışkan barda
`PAS 8 · n2` kaynak-etiketli çipler; güzelleştirme planı P1-7, 3 saat).
**Ön şart — bayatlık doktrini imzası:** son-beyan-kazanır + not-kaynağı görünür
+ hiçbir çip kendiliğinden sönmez/eksilmez (bayat skoru soldurmak da bir tür
yalancı güvence). İmza yoksa rail yapılmaz.

## 4. Gerçek-kullanım pürüzleri (dürüst liste)

| Eksik | Durum | Etiket |
|---|---|---|
| Intake düzenlenemiyor (yanlış yaş → baştan başla) | bilinçli must-cut'tı | **[README]** + POST-HACKATHON |
| Yenilemede konsültasyon kaybolur — PHI efemeral KARARI ama kullanıcıya söylenmiyor | tek satırlık dürüst not eklenebilir ("bu cihazda bile saklanmaz") | **[BU-HAFTA — 15 dk, düşük risk]** |
| Vitaller yapılandırılmamış (model hep "HR/RR/BP alın" diyor; yaş-bantlı norm karşılaştırması yarım) | must-cut'tı | **[README]** + POST-HACKATHON |
| Worklist çizgi-duvarı (hepsi tiklenince karalama defteri) | plan P1-1, 1.5s; tamamlanınca ASLA kutlama/yeşil yok | boşta kalırsa **[BU-HAFTA]** |
| Stream-öncesi ölü ekran (ilk-token gecikmesi) | plan P1-2, 0.75s; her video çekiminde görünür | **[BU-HAFTA]** öneri |
| Çıktı yalnız İngilizce (misyonun asıl kullanıcısına Türkçe yok) | çeviri ayrı güvenlik yüzeyi — doğrulanmadan yapılmaz | **[README]** + POST-HACKATHON |
| Mobil tur (hap girdi + panolar telefonda) | Şahin'in cihaz turu bekleniyor | **[BU-HAFTA — test]** |

## 5. ✅ ÇÖZÜLDÜ (10 Tem) — Skor aritmetiği artık KOD-SAHİPLİ

Canlıda üç kez görülmüştü (toplama hatası 9/10; "=11 → capped at 10/10";
anoreksi bileşen-atlaması). Jüri panelinin de 1 numaralı önerisiydi → yapıldı:
`functions/lib/consultScore.ts` PAS/Alvarado'yu yapısal intake'ten deterministik
hesaplar (eşikler referans §A/§B'ye demirli; WBC ≥10k PAS / >10k Alvarado ayrımı
dahil), her turda "CODE-COMPUTED SCORES" bloğu olarak gider; model yalnız dil
derisi — sunar, yorumlar, ASLA hesaplamaz. Lablar chat'teki yapısal şeritten
girilir (geçersiz giriş görünür işaretlenir, sessiz düşmez); çipler anamnez
kartında konsült ortasında yeniden işaretlenebilir (seri muayene); anlatıda
geçen ama işaretlenmemiş bileşeni model SKORLAMAZ, "çipi işaretle" diye bayraklar
(ret tablosuna aday 12. ret). Bayat istemci güvenliği: skor alanları olmayan
eski bundle → "scores unavailable this session", asla sönük-skor-otoriter.
`pnpm test` 15 birim testiyle repo kendi kanıtını üretir. Kuzey-yıldızının
companion yarısı KAPANDI.

---

## Bu haftanın önerilen sırası

1. **Gün-3 (11 Tem): klinik red-team** — kanıt üretimi; bulgular → prompt ayarı → redeploy.
2. **GROUNDED kanıt kartı** (~1.5s) + **stream-öncesi vuruş** (~0.75s) + **PHI-efemeral tek satır not** (~15dk) — toplam ~2.5-3 saat, hepsi kamera/jüri değeri taşıyor.
3. Boşta kalırsa: worklist sıkışması (P1-1).
4. **Gün-4 (12 Tem): video.** Gerisi README'ye dürüst yol-haritası cümleleri
   olarak girer — "eksiklerini bilen olgun proje" hissi jüride başlı başına puan.

## § Domain kütüphanesi — Şahin'in önerisi (10 Tem gece) **[POST-HACKATHON amiral gemisi]**

Şahin'in sözleriyle: *"öyle bir kısım eklenmeli ki hastalık eklensin ve chat
sadece eklediğimiz kısımdan cevap verebilsin."* = kuzey-yıldızının ürünleşmiş
hali. Dürüst çerçeve:

- **Teknik çekirdek hazır:** referans zaten veri (`appendicitisReference.ts`
  → `{{REFERENCE}}`). "Hastalık eklemek" = yeni referans dosyası + kayıt.
- **Gerçek iş — domain paketi:** prompt'taki apandisit-sert-bağlı parçalar
  (kapsam, mimikler, PAS/Alvarado hamlesi, yaş rayları, skrotal/ektopik)
  pakete taşınmalı: `DomainReference { scope, mimics, instruments, ageRails,
  referenceText }`. consultPrompt generalize edilir; hero'nun case-spec'inin
  companion karşılığı.
- **TAŞIYICI DUVAR:** serbest kullanıcı-yüklemesi ASLA — GROUNDED rozeti yalana
  döner (çöp-referans → otorite-tiyatrolu çöp-çıktı). Doğru model: uzman-yazımı,
  valide, versiyonlu referanslar KÜTÜPHANESİ; her alan ayrı red-team bataryası;
  her referans yayınlanabilir validasyon çalışması (Salus Research yolu).
- **Sıra:** (1) DomainReference arayüzü çıkar (davranış değişmeden refactor),
  (2) kayıt + alan seçici UI, (3) uzman yazım+validasyon boru hattı,
  (4) alan-başına red-team, (5) alan #2 = DKA→endokrin ya da sarılık→neonatoloji.
- **Bu hafta:** SIFIR kod. Videoda tek cümle + README yol-haritası + jüriye tek
  dosyanın gösterilmesi ("ikinci hastalık = ikinci dosya"). Gerekçe: prompt
  generalizasyonu Gün-3'te test edilecek TÜM rayları regresyona sokar; ikinci
  referans bu hafta dürüstçe valide edilemez.

## Gün-5 README yol-haritası cümle adayları (buradan derlenecek)

- Motor, alan-referanslarını veri olarak alır; apandisit ilk valide alandır (kuzey-yıldızı).
- Skor aritmetiği kod-sahipliğe taşınacak (PAS bileşenleri intake'ten deterministik).
- Yapılandırılmış vitals + intake düzenleme + Türkçe çıktı (çeviri validasyonuyla birlikte).
- Harita/sevk-ETA katmanı: motor sevk süresini zaten veri olarak işliyor; gerçek geodata beklenmekte.
- Kalıcı enstrüman rayı (bayatlık doktriniyle birlikte).
