# KONSÜLT GÜZELLEŞTİRME PLANI — "Dümdüz yazı farkımız olmaz"

> **Durum:** Karar-hazır plan. 10 Tem, tasarım-keşif workflow'u wf_c55868da (11 ajan:
> 2 denetim → 5 tasarım merceği → 3 red-team [parser-kırılganlığı / klinik-güvenlik /
> zaman-kutusu] → sentez; 28 öneri → 6 P0 + 9 P1, 12 iptal).
> **Kapsam:** SADECE render — telde düz metin akmaya devam eder, yüzü istemci çizer.
> Motor, hero (`hero-frozen-387809b`) ve sunucu dokunulmaz; tek istisna
> `consultPrompt.ts` OUTPUT format kontratına 2 küçük cümle.
> **Zaman kutusu:** P0 = ~10 saat, tek odaklı gün. 11-12 Tem klinik red-team + video
> için KUTSAL kalır. Gün sonunda sert-dur; her P0 maddesi tek başına ship'lenebilir.

---

## 1. ORGANİZE EDİCİ FİKİR

**Konsültasyon, saat 02:00'de bir vaka tartışmasıdır: sodyum lambasının altında konuşan
kıdemli bir meslektaş — ve onun cümlelerinden kendi kendini çizen soğuk enstrümanlar.**

Model düz metin akıtır; istemci onu İKİ REGISTERDA duyar:

- **SES** — (i) okuma-geri, (vi) sevk tavsiyesi ve tüm takip turları: sıcak Newsreader
  serif, ember vurgu, nefes payı.
- **ENSTRÜMAN** — (ii)-(v): soğuk sans/mono, parlayan skor metreleri, açık-ayırıcı-tanı
  panosu, alarm çerçevesi — her satır tele düştüğü anda kendini monte eden aletler.

Jürinin tek cümlede hissedeceği şey: **"içeri düz metin giriyor, ekranda bir başucu
enstrüman paneli beliriyor — ve panelin hiçbir şeyi asla güvenceye doğru çözülmüyor."**

### Küresel uygulama kuralları (her maddede geçerli)

1. Key'ler HER ZAMAN index-tabanlı, asla içerik-tabanlı (her render'da yeniden parse
   güvenliği — remount = animasyon yeniden ateşler).
2. Düğüm başına tek animasyon; hepsi `motion-safe:` kapılı.
3. Bant eşikleri YALNIZ ScoreMeter'daki mevcut fonksiyonda yaşar; asla ikinci yerde
   hardcode edilmez.
4. Düşük skor ASLA parlamaz, ASLA yeşil olmaz (yalancı-rahatlama dersi).
5. Renk grameri: **ember = insan karar ağırlığı · amber = dikkat/soru · kırmızı =
   yalnız alarm çerçevesi.**
6. İstemci ASLA klinik durum uydurmaz: enstrümanlar yalnız modelin yazdığını veya
   hekimin açıkça tıkladığını çizer.

---

## 2. P0 SETİ — 10 saat, kamera yolu sırasıyla

> Önce P0-1 (omurga). Geride kalınırsa kesme sırası: önce P0-6, sonra P0-4'ün sayaç
> çipi — tip sistemi / damga / metre ASLA kesilmez.

### P0-1 · İki-register tip sistemi — "dümdüz yazı"nın cevabı
**Yüzey:** ConsultProse başlıklar+paragraflar+ritim (App.tsx 2941-3023).
**2 saat · kamera: güçlü · kontrat değişikliği: YOK**

- `const VOICE = new Set(["i","vi"])` + numarasız bölümler (giriş cümleleri, takip
  turları, kontrattan sapmış çıktı) → hepsi SES sayılır, bugünkü serif'in birebir aynısı
  = bozulma inşaat gereği güvenli.
- Ses başlıkları: `text-[11px] uppercase tracking-[0.2em] text-ember-400/70`
  (numeral `font-mono text-neutral-600` kalır). Veri başlıkları (ii)-(v) değişmez soğuk.
- Veri bölümü paragrafları serif'i BIRAKIR → `text-[14px] text-neutral-300` sans.
  Newsreader artık yalnız sesin + ember kapanışın fontu.
- Ritim: kök `gap-3.5` → `gap-4`; ses bölümlerine `mt-1.5`.

### P0-2 · Intake-kontrol damgası — "nefes kesme" karesi (Mehmet/kız yakalaması)
**Yüzey:** ConsultProse blok renderer'ı, `sec.num === "i"` + numarasız bölümler
(takip turundaki yakalama da damgalanır). **1 saat · kamera: güçlü · KONTRAT: EVET**

- Regex: `/^confirm:\s*(.+)/i` — YALNIZ iki nokta (virgül değil: "Confirm, doctor…"
  damgalanmamalı) ve iki noktadan sonra dolu metin şart (yarım satırda boş damga yok).
- Görünüm: eğik amber damga `-rotate-3 border-amber-500/70 text-amber-300
  motion-safe:animate-stamp` içinde "CHECK INTAKE"; cümle `text-amber-200/90`;
  `sr-only` "possible intake inconsistency". **Amber, asla kırmızı** (soru, alarm değil).
  İstemcide onay butonu YOK — hekim yazarak cevaplar.
- Bozulma: prefix gelmezse bugünkü serif paragraf.
- **Kontrat cümlesi** ((i) maddesine ek): *"If anything looks inconsistent,
  contradictory, or importantly missing, put that flag on its own line starting exactly
  'Confirm:' — this line is in addition to the one-sentence read-back."*

### P0-3 · Skor enstrümanları — "= N/10" tele düşünce metre ÇALIŞMAYA BAŞLAR
**Yüzey:** ScoreMeter (2897-2927) + skorların render edildiği kabuk (2962-2964).
**2 saat · kamera: PARA VURUŞU · kontrat: YOK**

- Skor varsa kabuk: hero'nun fosfor-grid'li monitör zemini (`oklch(0.145 0.02 255)` +
  iki 1px %2.8-alfa gradient, `22px 22px`).
- Etiket monitör register'ına geçer: `font-mono text-[10px] uppercase tracking-[0.15em]`.
- Dolu segmentler `origin-left motion-safe:animate-bar-grow` + `animationDelay: i*45ms`
  → soğuk ray önce, bant-renkli dolgu üzerinden süpürülür.
- Parlayan sayı: `font-mono text-lg tabular-nums`; bant rengi: yüksek
  `oklch(0.70 0.20 25)`, eşdeğerli `oklch(0.83 0.16 75)`, **düşük
  `oklch(0.78 0.02 255)` ve parlamasız** — düşük soğuk ve ödülsüz kalır.
- Satır `key={name-value}` ile yeniden key'lenir + `animate-value-flash`: model YENİ
  bir değer beyan ederse tören dürüstçe yeniden oynar; aynı değer kıpırdamaz.
- `sr-only`: "{name} score {v} of 10, {band}". Bozulma: uyumlu skor satırı yoksa kabuk
  hiç çizilmez, bugünkü düz metin.

### P0-4 · Mimik Panosu — (iii) "Not Yet Excluded" kısıt panosu
**Yüzey:** ConsultProse `sec.num === "iii"` + consultPrompt.ts OUTPUT (iii)'e 1 cümle.
**2.5 saat · kamera: PARA VURUŞU · KONTRAT: EVET**

- Panel: `rounded-xl border-amber-500/25 bg-neutral-900/40 p-3.5`; başlık
  `text-amber-300/90`.
- Satırlar TEK flex-col'da ORİJİNAL blok sırasıyla (`divide-y divide-neutral-800/60`) —
  bullet'ları ayrı listeye TOPLAMA (araya giren paragrafı yeniden sıralamak = teli
  yanlış temsil).
- Her mimik: `◌` glifi (`text-amber-400`) + `sr-only` "not yet excluded"; ilk " — "
  ayracından bölünür: hastalık adı `text-sm font-semibold text-neutral-100`, ayırt
  edici test `text-[12px] text-neutral-500`. Bölme, iki tarafta tek sayıda `**`
  bırakıyorsa atlanır (bold-yayılma artefaktı). Ayraç yoksa tüm satır ad stilinde.
- Satır başına `motion-safe:animate-reveal-in` — hastalıklar stream'in temposuyla
  blur'dan TEK TEK yüzeye çıkar. **Videonun karesi bu: "bu oğlan için testis
  torsiyonunu istemeden düşündü."**
- Sayaç çipi (başlığın sağı): ilk mimik satırı gelene kadar GİZLİ ("0 not excluded"
  güvence flaşı olmasın); yalnız mimik-olarak-çizilen satırları sayar (aksiyom satırı
  `/ruling one out does not rule out/i` hariç). Metin varsayılan **"n not excluded"**,
  Şahin sert bulursa **"n on the table"**.
- Aksiyom satırı ember tören rayı: `border-l-2 border-ember-500/30 pl-3 font-vignette
  italic text-ember-300/90`.
- **ETKİLEŞİM YOK. Glifler istemcide ASLA durum değiştirmez** — bir mimiği yalnız
  modelin sonraki turu kapatabilir. (Tıkla-kapat fikri red-team'de ÖLDÜ: bir mimiği
  soldurmak = ayırıcı tanıyı görsel olarak çözmek.)
- **Kontrat cümlesi** ((iii) maddesine ek): *"Begin each mimic bullet with the mimic
  name, then ' — ', then the distinguishing test."*

### P0-5 · Kırmızı-bayrak alarm çerçevesi — (iv) monitörün kritik gramerinde, SESSİZ
**Yüzey:** ConsultProse `sec.num === "iv"` (P0-1 ile aynı bölge — birlikte yapılır).
**0.5 saat · kamera: destek · kontrat: YOK**

- Kart `border-red-900/50 bg-red-950/15`; başlıkta ve bullet başlarında STATİK `⚠` +
  `sr-only`; metin `text-neutral-200` kalır — kırmızı yalnız çerçevede ve gliflerde.
- **monitorAlarm yanıp-sönmesi BİLİNÇLİ YOK** (iki red-team de aynı kararı verdi):
  (iv) her konsültasyonda zorunlu → sürekli yanıp sönen alarm dekoratifleşir; alarmı
  alarm yapan çerçevedir.

### P0-6 · Sevk karar kartı — (vi) konsültasyonun ŞAFAK TÖRENİ
**Yüzey:** ConsultProse `sec.num === "vi"` + ConsultFlow'dan tek `transfer` prop'u.
**2 saat · kamera: PARA VURUŞU · kontrat: YOK**

- Kabuk: `relative overflow-hidden rounded-xl border-ember-500/25 bg-neutral-900/60 p-4
  motion-safe:animate-reveal-in`; üstte şafak yıkaması `h-24` @
  `oklch(0.73 0.15 62 / 0.12)` — **asla parlatma**: eşdeğerli bir sevkin üstünde güçlü
  şafak = rahatlama okunur.
- Flex başlık satırı (absolute DEĞİL — uzun başlık sarabilsin): kicker ember uppercase;
  sağda mono çip `transfer · {transferLabel}` (hekimin girdiği intake verisi, 2186-2190'da
  zaten türetili; null ise "transfer time not given").
- Paragraflar `font-vignette text-[16px] text-neutral-100`e büyür; "verify, you decide"
  ember italik imza kalır.
- inlineBold'a YALNIZ (vi)'ya scope'lu ton parametresi: `**commit before imaging**` →
  `font-semibold text-ember-300`. Sıcak vurgu başka yere genellenmez.
- Bozulma doğal: en kötü durumda sıradan düz yazının etrafında sıcak bir kart.

---

## 3. P1 SETİ — yalnız 11-12 Tem'de artan zaman olursa, red-team geçtikten SONRA, ROI sırasıyla

1. **Worklist çizgi-duvarı ölümü + ilerleme (1.5s, kontratsız).** Biten madde çizilmez;
   sıkışır+söner (`opacity-70 text-[13px] text-neutral-600`), ember ilerleme çubuğu +
   `{done}/{total} done` sayacı. **Tamamlanınca kutlama YOK, renk kayması YOK, yeşil
   YOK** — "adımlar bitti" asla "hasta güvende" okunmaz.
2. **Stream-öncesi vuruş (0.75s).** İki-sesli placeholder: serif soru + mono
   "consult open · appendicitis scope" + nabız atan ember nokta. Her çekimde ilk-token
   gecikmesi var = garantili görüntü.
3. **Tik pop'u (0.75s).** Worklist tiki için `tickPop` keyframe (damganın yaylanması,
   rotasyonsuz, kırmızısız).
4. **Konsült masası (1s).** Send butonu ember'e döner (uygulamanın tek beyaza-yakın
   elemanı ölür) + streaming durum satırı.
5. **GROUNDED kanıt çevirmesi (1.5s).** Pill → tıklanınca Holcomb & Ashcraft Ch. 40 /
   cerrah-valide referans kartı. "Bu sadece ChatGPT mi?" jüri sorusunun cephanesi.
6. **Vaka-tartışması çerçevesi (1.5s).** Lamba-noktalı "Salus · consult note N" imzası +
   hekim mesajlarına blockquote rayı. Şart: amber prototip banner'ı tam görünür kalır.
7. **Kalıcı skor rayı (3s).** Yapışkan barda son-beyan-kazanır skor çipleri; her çip
   not kaynağını taşır (`PAS 6 · n2`) → bayatlık okunur; **bayat çip asla soldurulmaz/
   düşürülmez** (bayat PAS 8'i soldurmak da güvencedir). Rail inşa edilmeden §5-2
   doktrini onaylanmalı.
8. **Skor makbuzu (1s).** Skor satırı mono kuyuda; son "="den bölünür ("=" yoksa
   bölünmez); parlama yalnız amber/kırmızı bantta — düşük sönük kalır.
9. **Bölüm blur-kaskadı (1s).** revealIn yalnız bölüm sarmalayıcılarında; satır-bazlı
   katman İPTAL (yarım-satır yeniden sınıflanması okuma odağında çift-ateşler).

---

## 4. İPTAL EDİLENLER (dürüstlük listesi — 7'si kopya, 5'i gerçek red)

| Öneri | Neden öldü |
|---|---|
| Damganın 2 kopyası | Scope'suz regex "- Check: urine dip" işini intake hatası diye damgalar |
| Ayrı mimik-panosu önerileri | P0-4'te birleştirildi (pano+sayaç+kontrat bir taraftan; revealIn+blok-sırası+etkileşimsizlik diğerinden) |
| Skor-iniş töreni | P0-3'ün aynı on segment üstünde kopyası |
| Referral Commit Card | P0-6'nın kopyası; absolute çipi uzun başlıkla çarpışıyor |
| Worklist-enstrüman varyantı | Şikâyet edilen strikethrough'u koruyor; ✓-damgası kalıcı eğik kalıyor |
| **Bedside Rail (masaüstü kenar rayı)** | Gerçek maliyet 12-16 saat = tüm P0 bütçesi; telefon demo karesiyken masaüstü-only; ilk takip turunda sayaçları boşaltıp YANLIŞ "her şey temiz" veriyor. Post-hackathon amiral gemisi. |
| Mobil enstrüman şeridi | Rayın tesisat maliyetini + bayatlık bug'ını miras alıyor; PAS 3'ü az-alarmlayan hardcode bantlar |
| Takip "updated" rozeti | Değişikliği model METNİNDEN değil kontrat VARSAYIMINDAN iddia ediyor = sapma altında uydurma |
| "5→8 ▲" delta çipi | Turlar-arası tesisat gerçekte 5-6 saat; yeniden-key'lenen metre zaten hareketi gösteriyor |
| Konsült defteri | Tamamlanınca ConsultProse'u remount edip hekimin worklist tiklerini SİLİYOR (setteki tek durum-mayını) |
| Alt-tutma pill'i | Kendi beyanıyla kamerada görünmez; doğru mühendislik, yanlış hafta |
| Tek-kart başlık | Güvenlik banner'ının etrafında 3 saatlik markup cerrahisi; banner-görünürlüğü riski. Bedava demo çözümü: çekimde anamnez kartını katla |

---

## 5. İMZA GEREKTİREN RİSKLER (Şahin)

1. **P0'da tam İKİ kontrat cümlesi var** — (i)'ye `Confirm:` satırı, (iii)'e
   `Ad — test` ayracı. İkisi de model saparsa bugünkü görünüme sorunsuz düşer ve ham
   tel temiz düz yazı olarak okunur. Maliyet: modelin becermesi gereken 2 yeni talimat.
   **Azaltma:** 11 Tem red-team'inde ~10 üretimde iki işaret de doğrulanır; uyum
   kötüyse cümleler BİRBİRİNDEN BAĞIMSIZ geri alınır.
2. **Bayatlık doktrini** (yalnız P1-7 rail yapılırsa): kalıcı çip klinik güncelliğini
   yitirebilir. Çözüm kaynak-etiketi + son-beyan-kazanır + "hiçbir şey kendiliğinden
   eksilmez/sönmez" mutlak kuralı. Rail'den ÖNCE bu doktrine imza — yoksa rail yapılmaz.
3. **Tören yoğunluğu:** ilk cevapta artık damga + çalışmaya-başlayan metre + yüzeye
   çıkan pano + şafak kartı var. Tasarımda azaltıcılar hazır (damga yalnız gerçek
   tutarsızlıkta; %12-alfa şafak; (ii)-(v) tip sistemiyle SOĞUKLAŞIYOR) — yine de P1
   hareketleri onaylamadan önce TEK gerçek yavaş stream'de bütün cevabı izle.
4. **Klinik kelime kararı:** (iii) sayaç çipi — "n not excluded" mı, yumuşak
   "n on the table" mı? Red-team günü senin kararın.
5. **Bilinçli eksiklikler (Q&A savunusu):** kırmızı-bayrak bölümü YANIP SÖNMEZ (sürekli
   alarm dekoratifleşir), mimik satırları TIKLANMAZ/SOLDURULMAZ (istemci ayırıcı tanıyı
   asla görsel çözmez), düşük skor PARLAMAZ ve hiçbir yerde YEŞİL YOKTUR — bunlar
   ihmal değil tasarım kararıdır.
