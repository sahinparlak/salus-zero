# Gün 3 — Kod İnceleme Triage (Debrief + Skorlama)

> 2026-07-08 gecesi, 53-ajanlık adversarial workflow (`wf_e0244f53`):
> 6 mercek (skor doğruluğu · güvenlik/sızıntı · klinik savunulabilirlik ·
> debrief promptu/injection · UI akışı · DoD tamlığı) → 23 tekilleştirilmiş
> bulgu → her biri 2 bağımsız çürütücüyle doğrulandı (23/23 sağ kaldı,
> 0 çürütüldü). Doğrulama sonrası **A sınıfı (mekanik/güvenli) düzeltmelerin
> tamamı aynı gece uygulandı ve yeniden test edildi**: typecheck + build +
> bundle sızıntı grep (0) + 31-kontrollük skor battery + gerçek-Claude
> uçtan uca playtest (iki uç: 77/100 sevk oyunu, 5/100 clockMax felaketi).

## A · Uygulandı (17 düzeltme — Şahin'in bilgisine)

| # | Bulgu | Düzeltme |
|---|---|---|
| 1 | **Zamanlama telefon-bitişine göre notlanıyordu** — görünen saatte 76-90 arası tıklayan oyuncu gizlice bant düşüyordu; debrief kaydında aynı eylem için İKİ çelişkili damga vardı (CONFIRMED/serious) | Skor artık **KARAR anını** (commit tıklamasındaki saat = orderedLog draw-minute) notluyor; zincir aktivasyonu yalnız ambulans ETA'sına anlatı olarak kalıyor. Sevkle aynı tura bağlanan sıvı/antibiyotik artık zamanlama puanı yakmıyor (ctContrast'ın öğrettiği oyun). Log yoksa aktivasyon dakikasına geri düşer (asla daha cömert olmaz). ⚠️ B-1'de onayın gerekiyor. |
| 2 | Debrief transcript'i çitsiz güvensiz girdiydi (injection) (CONFIRMED/serious) | Sistem promptuna güvensiz-girdi zırhı + transcript `<transcript>` çitiyle işaretlendi |
| 3 | "Kayıt > anlatı" öncelik kuralı yoktu — anlatılan-ama-loglanmayan eylem prozu skora ters düşürebilirdi (CONFIRMED/serious) | FACT DISCIPLINE'a kayıt-üstünlüğü kuralı eklendi: niyet transcript'ten, EYLEM yalnız kayıttan |
| 4 | strengths şeması 2-4 zorunluydu → sıfır-eylem gecesinde uydurma övgüye zorluyordu | "1-4, dürüst minimal" + UI'ya boş-strengths fallback'i |
| 5 | Restart çıkmazı: /api/case hatasında bayat caseData temizlenmiyordu | `setCaseData(null)` eklendi; debrief hata bandına "Begin another night" eklendi |
| 6 | Disiplin cezaları 25'i aşınca ekrandaki aritmetik toplanmıyordu | "floored at 0" satırı eklendi |
| 7 | Debrief log kırpması son-200'dü → en erken orderlar (ayırıcı kredi + karar anı) düşebilirdi | İlk-200'e çevrildi |
| 8 | Reddedilen istek ayırıcı-tanı kredisi alabilirdi (motor-genelliği) | Kredi yalnız gerçekten yapılabilir aksiyonlara |
| 9 | `pnpm dev` (vite) functions/ kaynağını HTTP'den servis ediyordu (lokal spoiler) | vite.config'e `server.fs.deny: ["functions/**"]` |
| 10 | getCase prototip anahtarlarında ("__proto__" vb.) 500 çöküyordu | `Object.hasOwn` guard'ı |
| 11 | 502'ler ham Anthropic hata gövdesini oyuncuya basıyordu | turn+debrief: detay worker loguna, istemciye nazik genel mesaj |
| 12 | Bekleme maliyeti saat tavanında kesilse de "300 dk" yazıyordu | Gerçek geçen süre + "(cut short by the end of the night)" |
| 13 | Hasta kimliği kod kaydında yoktu (model transcript'e muhtaçtı) | Kayda hasta satırı eklendi |
| 14 | Bağlantı-koptu özrü modele kendi anlatısı diye geri gidiyordu | `CONNECTION_NOTE` history'den ayıklanıyor (görüntüde kalıyor) |
| 15 | Anahtarsız mock final sahneyi kapatmıyordu | streamMock'a endReason dalları |
| 16 | fetchDebrief zaman aşımı yoktu — asılı upstream sonsuz "reviewing…" | `AbortSignal.timeout(180s)` → hata+retry durumuna düşer |
| 17 | (2 numaralı bulgunun UI yarısı) strengths boşsa çıplak kutu | Fallback metni |

## B · Şahin'in kararı (klinik/tasarım — GUN3-SKOR-ONAY.md'de genişletildi)

1. **Zamanlama semantiği onayı:** 90 dk hedefi KARAR anı mı (uygulanan;
   vaka dosyasındaki "initiated" yorumuyla uyumlu) yoksa çağrı-bitişi mi?
   Uygulanan haliyle görünen saat = notlanan saat; geri almak tek satır.
2. **Sıfır-workup anında sevk = 85** — vakanın kendi öğrettiği yol (~74-77)
   ve tam workup'tan (77) YÜKSEK puan alıyor (PLAUSIBLE/serious).
3. **Muayene hiç puanlanmıyor** — hiç dokunmayan oyuncu ayırıcı dışında
   hiçbir şey kaybetmiyor; gastroenterit mimiği için (anamnez/seri muayene)
   ayırıcı kredisi de yok (CONFIRMED/serious).
4. **100 matematiksel olarak ulaşılamaz (max 97):** 4 test + sevk seri olarak
   90 dk'ya sığmıyor (5+30+25+40+15=115). Seçenekler: CBC'yi ayırıcıdan çıkar /
   hedefi kaydır / "bu gecede mükemmellik yok" diye bilinçli bırak (tematik!).
5. **240 dk yolculuğa transfer-hazırlığı (sıvı/abx/NPO) puanı yok** — vakanın
   kendi hedef metni bunu öğütlüyor ama skor saymıyor (P1 adayı).

## C · Kabul edildi / ertelendi

1. **Debrief fail-closed:** model çağrısı düşerse skor da gelmiyor — retry
   butonu var, video önceden kaydedilecek; karmaşık kısmi-cevap tasarımına
   değmez (demo kapsamı).
2. **Sayfa yenilenince gece kaybolur:** localStorage kalıcılığı Gün 4 cila
   adayı; demo yolunda yenileme yok.

## Doğrulama izi

- Battery: 31/31 (karar-anı semantiği, bant sınırları, floor, fallback,
  bundle-care senaryosu dahil) — scratchpad, repoya girmedi (roadmap: test altyapısı yok).
- E2E (gerçek Claude, localhost): iki tam oyun — sevk 77/100 + clockMax 5/100;
  mid-case debrief 409 guard'ı; final sahne kapanışı; injection çitli debrief.
- `dist/` grep: tanı/ground-truth string'i 0 eşleşme.
