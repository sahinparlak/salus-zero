# 🎨 GÜZELLEŞTİRME PLANI — SALUS Zero (Yüzey Yeniden Tasarımı)

> **Amaç:** Motoru farklılaştıran her şey KODDA ve ÇALIŞIYOR; eksik olan **yüzey**.
> Ekran şu an "her karanlık AI/chat uygulaması" gibi görünüyor, altındaki dünya
> modeli görünmüyor. Bu belge, o farklılaşmış motora bir **YÜZ** vermenin planı:
> zaten var olanı ortaya çıkarmak. Kaynak: 15-ajanlı tasarım keşfi (wf_483245c2 —
> denetim + vizyon + kamera-haritası + fizibilite → 3 estetik yön → 8 bileşen reçetesi).
>
> Kuzey yıldızı: *"02:00, taşra hastanesi, tek nöbetçi sensin. En yakın CT dört saat
> uzakta. En yakın cerrah sensin."* — ve *"elin olmayan yerde bir el."*

---

## 0 · YENİ SOHBETE NOT (bunu ilk oku)

1. **Bu belgeyi + hafıza covenant'ını (`salus-zero-covenant.md`) oku.** Gün 0-4 bitti,
   motor donuk; bu bir **saf yüzey/sunum** redesign'ı — sadece `src/App.tsx` +
   `src/index.css`. `functions/**`'a DOKUNMA (§3 sınırlar).
2. **Şahin hâlâ iki şey borçlu, ondan iste:** (a) **estetik yön seçimi** (§4'te üç
   yön + tavsiyem var), (b) varsa **referans/ruh** (bir ekran görüntüsü, uygulama,
   film karesi). Seçimi almadan tüm ekranı körlemesine giydirme — önce TEK anı
   güzelleştir, o "evet, benim gecem" desin, sonra yay.
3. **İki bitiş çizgisi:** (FL1) submit edilebilir güzel-yeter sürüm (video + URL)
   **13 Tem'den önce**, sadece render katmanı, kamera-yolu önce. (FL2) izin sonrası
   açık pist — motor-komşusu iş (yapılandırılmış editoryal alanlar, ikinci vaka,
   view-transition koreografisi). **Bölme çizgisi:** değişiklik tamamen render
   katmanındaysa ve sadece halihazırda-public veriyi okuyorsa → FL1; yeni bir veri
   alanı / yeni availability / yeni fizyoloji gerekiyorsa → FL2.
4. **Kamera-yolu önce.** "Güzel"in ölçüsü, videonun gösterdiği anlar. Her fazdan
   sonra: `pnpm typecheck && pnpm build`, telefonda bak, `dist` sızıntı grep'i (tanı
   string'i 0), altın E2E oyunu hâlâ oynanabilir.

---

## 1 · TEŞHİS — neden "ilkel" hissediyor

> **Denetimin özeti:** *Motor sinematik; yüzey bir Tailwind starter kit.*

~9 panelin hepsi aynı damga: `rounded-xl border-neutral-800 bg-neutral-900/60` +
minik `uppercase tracking-wider` gri etiket, düz `neutral-950` zeminde, stok
emerald/amber/red/sky ile. **Sanat yönetimi yok, gece/yalnızlık atmosferi yok, sahip
olunan bir yazı tipi/aksan yok, görsel hiyerarşi yok** — her yüzey eşit ağırlıkta, o
yüzden farklılaşmış mekanikler dipnot olarak saklanıyor:

| Farklılaşmış gerçek | Şu anki pikseli |
|---|---|
| **Saat = düşman** (zaman kanıyor) | 14px nötr bir pill |
| **"CT isteyemezsin"** (imza an) | 6px kırmızı bir nokta |
| **Yaşayan monitör** (her tur kayan vitaller) | statik bir tanım listesi (`<ul>`) |
| **Dünya motoru** (gizli gerçek üstünde oynuyor) | yanıp sönen imleçli bir chat log |

**En büyük kaldıraç:** kasıtlı bir **gece sanat yönetimi** kur + **SAATİ görsel
başkahraman yap** + **sıcak anlatı yüzeylerini** (vignette, koğuş, debrief — sıcak,
ışıklı, insani) **soğuk enstrüman yüzeylerinden** (vitaller, kısıt panosu — soğuk,
monitör) AYIR. Motorun zaten sunduğu "02:00, tek doktor sensin" vizyonunu yüzeyin
sonunda ifade etmesi bu ayrımdan geçiyor.

---

## 2 · KUZEY YILDIZI — yüzey neyi HİSSETTİRMELİ

**İlk 10 saniye:** 02:00'nin o özel yalnızlığı — kimsenin uyanık olmadığı bir saatte
sana bir çocuk bırakılmış. "Karanlık dashboard" soğuğu değil; **gece**: ölü saatte bir
koğuşun alçak, kaynaksız ışığı, sana karşıymış gibi duran bir 02:00, ve bir satır —
*"En yakın CT dört saat uzakta. En yakın cerrah sensin."* — tagline değil, bir ağırlık.
Uygulama açılışı değil, **nöbetin başlaması** gibi hissetmeli.

**İfade hedefleri (yüzey bunları taşımalı):**
- **Gece = yer, tema değil.** Sıcak-sodyum ışık havuzu, derin soğuk-mavi karanlığa
  karşı. "Dark mode" bir ZAMAN ve YER olsun. Duvar saati (02:00) birinci sınıf bir
  nesne, header'da bir çip değil.
- **Saat = antagonist.** Geçen zaman TİKLEMESİN, **kanasın**. Her turun maliyeti
  (+40 dk CBC) bir yara gibi. "Apandisit yorgun olmanı umursamıyor."
- **Kıtlık = viseral.** "CT isteyemezsin" odayı durduran bir AN olmalı, listede bir
  kırmızı nokta değil. Eksik olan (CT/USG/cerrah/PICU) binadaki kilitli kapılar.
- **Yalnızlık.** Tek kişi, tek başucu — komuta merkezi değil. Karar kutusundaki kendi
  cümlelerin, eyleme geçen tek ses.
- **İnsan > telemetri.** Emir top oynamayı kaçırmış, her tümsekte ağlamış bir çocuk;
  annesi konuşuyor. Vignette + hasta kartı = ruh; otantik, editoryal, yakın.
- **Kötüleşme = dehşet.** Monitör her tur değişir; yükselen HR, tırmanan ateş, ve
  perforasyondaki **yalancı-rahatlama uçurumu** (ağrı düşer, HR/ateş tırmanır) —
  sayılar çocukla açıkça çelişsin. Yüzey ağrı düşüşünü ASLA iyi haber gibi renklemez.
- **Geri dönülmez ağırlık.** Sevki başlatmak tek geri-alınamaz eylem — eşiği geçmek
  gibi hissetmeli, tıklanan bir buton değil.
- **Başhekimin yargısı = hesaplaşma.** Debrief = money shot: gece açığa çıkar, gizli
  tanı ilk kez adlandırılır, "doğruydun ama iki saat geç" yakalanır. Şafakta sana
  dönen kıdemli bir meslektaş — bir skor ekranı değil.

**Yüzey derinliği nasıl AÇIĞA ÇIKARIR (icat etmez):** monitör dünyanın enstrümanı gibi
okunsun (senin altında değişir, "dk N" damgalı) · T+ defteri seni görünür şekilde
borçlandırsın · red bir kapalı kapı gibi odayı işgal etsin · debrief gizli gerçeği bir
DÖNÜŞ olarak açsın (skor değil).

**KAÇINILACAK anti-desenler:** chat-log transkript (baloncuklar/"You" çipi/"AI yazıyor")
· jenerik karanlık SaaS dashboard (eşit gri kartlar) · vitaller-bullet-list · kıtlık =
kırmızı nokta · oyunlaştırılmış oyuncak (konfeti/rozet/kutlama) · AI-chrome (✨/"Powered
by AI"/mor gradyan/"Generate" butonu) · açılışta her paneli göstermek · dondurulmuş
motorla savaşan aşırı-tasarım (motion-graphics maksimalizmi).

---

## 3 · SINIRLAR & İKİ BİTİŞ ÇİZGİSİ *(önce oku — güvenlik omurgası)*

### 🚫 DOKUNMA (motor sınırı + gizli-gerçek güvenliği)
- **`functions/**` tamamı** — dünya motoru. caseSpec/vaka/stages/groundTruth/score/turn/
  debrief handler'ları: hiçbiri.
- **`src/App.tsx:4` `import type { PublicCase }` — TİP-ONLY kalmalı.** Value import'a
  çevirmek worker kodunu (stages, groundTruth, API-key yolu) tarayıcı bundle'ına çeker.
- **`toPublicCase()` projeksiyon sınırı.** Tarayıcı sadece şunları görür: id, version,
  title, axis, vignette, patient, vitalsCatalog (`drift` SOYULMUŞ), initialVitals (=S0),
  resourceProfile, constraintBoard, actionCatalog, safety. **Soyulmuş alanı yeniden
  kurma** — özellikle **istemcide `drift` yeniden hesaplama**: yalancı-rahatlama ağrı
  "step" uçurumu vakanın merkez tuzağı; `drift` tam da bu yüzden soyuldu.
- **Gelecek fizyoloji görünmez.** `initialVitals` = sadece S0; sonraki her set tur-tur
  `x-salus-state` header'ından gelir. Herhangi bir **trend/sparkline SADECE istemcinin
  tur-tur ZATEN GÖRDÜĞÜ değerleri** çizebilir (React state'te biriktir). Bir sonraki
  değere doğru asla interpolasyon yapma — bu, sahip olunmayan fizyoloji uydurur.
- **Reveal yolu.** `DebriefData` (groundTruthReveal, ctContrast, axes, misses, lesson) —
  gizli gerçeğin istemciye ulaştığı TEK kanal, ve sadece `sim.caseOver` SONRASI
  `POST /api/debrief` ile. Prefetch etme. `loadStoredSession`'ın caseOver oturumu
  açılışta DÜŞÜRME kuralını (App.tsx:126-129) bozma — yoksa uygulama spoillenmiş
  reveal'la açılır.
- **İstemci durum makinesi:** applyStateHeader, streamInto, beginCase/sendTurn/
  fetchDebrief, optimistik transcript çifti + rollback, stateApplied guard, CONNECTION_NOTE,
  oturum kalıcılığı (STORAGE_KEY/SESSION_V). Bunların RENDER'ını değiştir, NE HESAPLADIĞINI
  veya NE ZAMAN çalıştığını değil.
- **`historyText()` (App.tsx:140-168)** worker'ın `composeTurnMessage`'ının aynası —
  ÇIKTI METNİ byte-uyumlu kalmalı (modele kendi geçmişi olarak geri oynatılıyor). Meta'nın
  nasıl GÖSTERİLDİĞİNİ değiştir, yaydığı STRING'leri değil.
- **İki adımlı sevk commit'i:** tek tıkla vaka bitmez. Hem serbest-metin transfer
  bahsi hem START REFERRAL butonu aynı onay şeridini KURAR. Açık onayı koru.
- **`resourceProfile.available/unavailable` motorun omurgası, gösterge bayrağı değil.**
  Availability CANLI BİR TOGGLE DEĞİL.
- **Vital formatı:** `value.toFixed(v.precision)` + kritik/anormal ton mantığını KORU
  (kamerada "38.0"→"38" titremesini durduran load-bearing yorum).

### ✅ DEĞİŞTİRİLEBİLİR
- **`src/App.tsx` içindeki TÜM JSX + Tailwind class'ları** — redesign burada yaşıyor.
- **`src/index.css`** (şu an sadece `@import "tailwindcss";`) — `@theme` tasarım
  token'ları, `@keyframes`, `@property`, custom `@utility`, ambient atmosfer CSS'inin evi.
- Landing (§591-606), header+saat (§567-589), vignette kartı (§621-641), transkript
  (§643-704), DecisionBox (§823-922), VitalsPanel+MobileVitalsStrip (§958-1044),
  ConstraintBoard (§1217-1255), DebriefPanel+ScoreGauge (§1048-1215), "gece karara
  bağlandı" ara ekranı (§706-740), disclaimer/footer.

### Editoryal kapsam (Şahin'in isteği — dürüst sınır)
- **Vignette + hasta kartı = GÜVENLİ, önerilir.** `vignette` + `patient` PUBLIC ve gizli
  gerçekten kopuk. FL1 için: halihazırdaki alanların **render-katmanı editoryal
  muamelesi** (dergi tarzı hasta kartı, annenin sözleri set tipografi olarak). İsteğe
  bağlı **yazar modu**: istemci-tarafı `editorial` override (AYRI localStorage anahtarı,
  frozen session anahtarından bağımsız), hiçbir fetch'e girmez → sızıntı-geçirmez,
  motor-donuk. **Sert güvenlik:** eklenen hiçbir başlık/caption tanıyı ima etmesin.
- **Kısıt panosu kaynakları:** `label`/`detail` KOPYASI güvenli (editoryal). **Ama
  availability CANLI TOGGLE DEĞİL** — hidden sim onun üstünde mühendislik edilmiş (refuse
  grounding, forbiddenResources skoru, bedside/phone bölümü). Ne olduğunu değiştirmek =
  tutarlı yeni bir vaka yazmak = **FL2**.

### Teknik notlar (atmosfer & hareketi güvenle uygulamak)
- **Tailwind v4 config'siz** → `index.css`'e `@theme` bloğu (ör. `--color-night-950`,
  `--color-ember-500`, `--font-vignette`); Tailwind eşleşen utility'leri (`bg-night-950`)
  otomatik üretir. Arbitrary değerler (`bg-[oklch(...)]`) config'siz çalışır.
- **AĞIR BAĞIMLILIK YOK** (framer-motion/GSAP = gereksiz bundle, işaretle-kaçın). Araç
  kutusu: (1) `@keyframes` ambient loop'lar SADECE transform/opacity (GPU) · (2) `@property`
  ile conic-gradient saat halkaları · (3) Tailwind state transition'ları · (4) ScoreGauge
  zaten SVG `strokeDasharray` ile animasyonlu — `stroke-dashoffset` transition'ı sıfır
  bağımlılıkla "dolum" verir · (5) React 19 `startViewTransition` sahne geçişleri için
  SADECE progressive enhancement (Safari kısmi, asla load-bearing).
- **TÜM ambient hareketi `motion-safe:` arkasına al** + ham keyframe'lerde
  `prefers-reduced-motion` onurla. Reduced-motion jürisi sakin ama CANLI bir 02:00 almalı.
- **Vital sayılarını ara-değerlere doğru ANİME ETME** (uydurma fizyoloji). Değişim
  ÜZERİNE kısa opacity/renk flaşı tamam; eskiden-yeniye sayma animasyonu DEĞİL.
- **Performans:** transkript HER token'da yeniden render olur (setState/delta). Ambient
  hareketi stabil ata elemanlara bağla, asla token-token render olan düğüme. Büyük alanda
  filter/backdrop-blur/box-shadow animasyonundan kaçın; transform/opacity tercih et.
  Sticky MobileVitalsStrip'in `backdrop-blur`'ünü statik tut.
- **Mobil gerçek demo cihazı.** `md:grid-cols-3` tek sütuna çöker, aside transkriptin
  ALTINA düşer; sticky MobileVitalsStrip monitörü ekranda tutar — bu deseni koru. Gece
  atmosferi + saat + CT-red anı dar viewport'ta OKUNMALI.
- **Font:** normal web app (Artifact değil) → self-hosted display/serif Vite ile serbest,
  ama her aile gerçek bir ağ varlığı — gerekçelendir, subset'le. Bütçe darsa vignette için
  sistem-serif stack yeter. **CDN font tag'i YOK** (demo offline olabilir).

---

## 4 · ÜÇ ESTETİK YÖN + TAVSİYE

Her üçü de: CSS-first, deadline-güvenli, "sıcak-merkez / soğuk-çevre" yapısını paylaşıyor
(denetimin de dediği). Fark: sıcaklığın dozu, tip sesi, ve neyi ön plana koyduğu.

### A · CINEMATIC NIGHT — *bir film, uygulama değil*
Letterbox çerçeve + TEK sıcak ışık havuzu (sadece hasta+karar yüzeylerinde), near-black
volumetrik karanlık, saat bir "zaman-bombası alt-hikâyesi" gibi. Tip: **Newsreader** serif
(kanca + annenin sesi). İmza: letterbox+havuz, title-card saat, mürekkep-damga red,
nefes alan enstrüman, şafak-kesme debrief.
- **Güçlü:** vizyonu en LİTERAL karşılayan — yalnızlık bir kompozisyon problemi olur.
- **Risk:** düşük kontrast/letterbox laptop+parlak odada okunurluğu düşürür; klinisyen
  "sinematik = ciddiyetsiz tiyatro" okuyabilir; mobilde dikey alan yer.

### B · HUMANE DOCUMENTARY — *3'te dosyalanmış bir foto-deneme*  ⭐ TAVSİYEM
Fotojurnalistik kısıtlılık, **annenin tanıklığı tipografik merkez**, sıcak-ama-ciddi,
bir foto-deneme caption sistemi. Tip: **Newsreader** (annenin sesi = ürünün ruhu). İmza:
tanıklık pull-quote'u, caption sistemi, "denied requisition" red damgası, sodyum lamba
havuzu, yalan söylemeyen enstrüman, hesaplaşma olarak şafak.
- **Güçlü:** misyonu ("elin olmayan yerde bir el", "10 çocuktan 1'i") en doğrudan
  karşılayan; "vizyonumu yansıtmıyor" derdine en iyi cevap; klinik jüri için ciddi.
- **Risk:** editoryal sütun baskın olursa "güzel bir landing page" olup karar aracı
  olmaktan çıkar → **soğuk sağ sütun (saat+enstrüman) her zaman çerçevede, tabular,
  soğuk kalmalı; ambulans çubuğu + settle-flash ilk turdan baskılamalı.** Tipografi
  zanaatına bağlı — %80 fidelity "sadece karanlık bir blog"a çöker.

### C · CLINICAL PRECISION — *ciddi klinik yazılım, tek sıcak ada*
Linear/Apple-Health disiplini + gerçek başucu monitörü grameri. **Sans-dil / mono-ölçüm**
ayrımı, hairline sistem, kanal-satırlı monitör. Tip: **Inter Variable** (ölçüm için sistem
mono). İmza: monitör modülü, sans/mono ayrımı, sabit-enstrüman saat, hairline sistem,
sistem-reddi red, TEK sıcak ada (vignette).
- **Güçlü:** motorun OTORİTESİNİ görünür kılan — gizli-gerçek + satır-satır skor "ciddi
  klinik enstrüman" olarak okunur; monitör drift'i ve yalancı-rahatlamayı kamerada
  OKUTUR; soğuk sistem içinde tek sıcak ada daha yüksek sesle okunur.
- **Risk:** soğuk/jenerik-SaaS'a en yakın; monitör trace'i + sans/mono ayrımı + sıcak
  vignette adası atlanırsa jenerik dashboard'a çöker; 2'nin başında laypeople'a fazla
  "enterprise" gelebilir.

### ⭐ TAVSİYE — **B (Humane Documentary) omurga + C'nin enstrüman modülü**
Üç yön de "sıcak anlatı / soğuk enstrüman" ayrımında birleşiyor; en güçlü hamle bunu
kasıtlı yapmak:
- **Anlatı yüzeyleri** (landing, vignette, koğuş, debrief) = **Humane Documentary** —
  annenin sesi merkez, sıcak sodyum havuzu, editoryal tipografi. Misyonu bu taşır ve
  "vizyonumu yansıtmıyor" derdinin doğrudan panzehiri.
- **Enstrüman yüzeyleri** (vitaller, saat, kısıt panosu) = **Clinical**'in başucu-monitör
  modülü + sabit-enstrüman saat + sans/mono ayrımı. Motorun otoritesini ve yaşayan
  fizyolojiyi kamerada bunlar okutur; soğuk kalarak sıcak anlatıyı yükseltir.
- **Cinematic**'in letterbox+havuz+şafak-kesme'sini bir "kadran" olarak SADECE hero
  anlarda (cold-open landing + debrief reveal) uygula — global uygularsan okunurluk riski.

Bu hibrit, bileşen reçetelerinin (§6) zaten "yön-agnostik çekirdek + varyasyon" yazılmış
olmasıyla birebir uyuşuyor: çekirdeği kur, sıcak yüzeye B varyasyonu, soğuk yüzeye C
varyasyonu, hero'ya bir tutam A giydir.

**Ama son söz Şahin'de.** Bir referans/ruh verirse (film karesi, uygulama, ekran
görüntüsü) yön netleşir. Karar noktaları §9'da.

---

## 5 · KAMERA-YOLU HARİTASI (video 5 vuruşu → UI anı → öncelik)

| Vuruş | sn | UI anı | Şu anki açık | Öncelik |
|---|---|---|---|---|
| **1 · Kanca** (cold-open) | 0:00-15 | Landing + tagline + disclaimer + "Begin" | İlk piksel amber disclaimer bandı; kanca 14px alt-metin; kart-içinde-sayfa | **P0** |
| **2 · Kurulum + İMZA TWIST** | 0:15-45 | ConstraintBoard + vaka kartı → "Order CT" → RED | CT-red = 11px kırmızı fragman + 1.5px nokta; pano = renkli nokta lejantı | **P0** |
| **3 · Serbest-metin + kanayan saat** | 0:45-1:20 | DecisionBox + saat + kayan vitaller + koğuş | Saat = köşede nötr pill, kanmaz; drift OKUNMAZ (delta/flaş yok); chat-log | **P0** |
| **4 · Debrief = MONEY SHOT** | 1:20-2:00 | DebriefPanel + ScoreGauge | En yüksek ağırlık, en az tasarlanmış: reveal törensiz, eksenler `<details>`'te gizli, statik halka | **P0** |
| **5 · Kapanış misyon** (statik) | 2:00-30 | (yok — sadece 12px footer) | Misyon "10 çocuktan 1'i" üründe hiç ifade edilmiyor | **P1** |
| Opsiyonel motor-kanıtı (DKA/2-profil) | ~15sn | Pano+kart farklı veriyle | Vaka kimliği okunmuyor → swap kamerada kanıtlamıyor | **P2** |

**Kamera-önce yüzey sırası:** Debrief money shot → CT-red anı → kısıt-panosu ledger →
saat antagonist → yaşayan monitör → cold-open landing → vignette editoryal kart →
koğuş kroniği → kapanış misyon kartı.

---

## 6 · BİLEŞEN-BİLEŞEN REÇETELER (iş kalemleri)

> Her kalem: **şimdi → hedef**, yapısal hamle, efor (S/M/L), kamera-önceliği. Tam
> uygulama notları (satır no'ları, Tailwind teknikleri, veri kaynağı, mobil, engine-safety)
> keşif materyalinde — gerekirse `wf_483245c2` journal'ından çek. Hepsi **surface-only**.

### 0 · TEMEL — GECE atmosferi + tasarım-token sistemi  ·  M · P0 · *(önce bu)*
Düz tek-değer karanlık + tek-tip kart grid'i → **KATMANLI IŞIK ALANI** + sıcak-merkez/
soğuk-çevre. (1) Root'un ilk çocuğu olarak `fixed inset-0 -z-10` bir ışık katmanı: soğuk-mavi-
siyah taban + merkez-dışı sıcak **radyal "lamba"** gradyanı (nefes alan, motion-safe) +
kenar vignette'i. (2) İki sütunu ışıkla yeniden katmanla: başucu sütunu IŞIKTA (sıcak,
kaldırılmış, yumuşak glow), enstrüman aside'ı KARANLIKTA (soğuk, geri çekilmiş). Aynı
markup, ışıkla yeniden ağırlıklandırılmış. `index.css`'e `@theme` night paleti +
`@keyframes lampBreath` (sadece opacity). Disclaimer bandını hairline caption'a indir.
**Her şey bu çerçevede ışıklanır → ilk bu kurulmalı.**

### 1 · LANDING / cold-open  ·  M · P0
Banner-önce/header-önce/kart-içinde-sayfa → **tek kompoze tam-viewport çerçeve, üç nesne
geniş negatif alanda:** SAAT (02:00, birinci sınıf), KANCA (üç kademeli clause blur-in),
KAPI (tek sıcak CTA "Begin the night shift"). Kartı KALDIR (border/bg yok), kanca gecede
yüzsün. Tagline'ı alt-metinden hero display satırına ÇIKAR. Disclaimer'ı alt hairline
caption'a İNDİR. `!caseData` state'ine gate'le (vaka yüklenince header/banner geri döner).
Landing'de `caseData=null` → sızacak veri YOK; tek dinamik `wallClock(0)`="02:00".
`min-h-[100svh]`, CTA tap-hedefi `py-3`.

### 2 · SAAT = antagonist  ·  M · P0
İki küçük pill → **birinci-sınıf zaman nesnesi.** Duvar saati 02:XX büyük tabular; altında
T+dk bir BORÇ; ince bir **ufuk çizgisi** zamanı 4-saat ambulans erişimine karşı UZAMSAL
gösterir (biten pist). Her tur saat SIÇRAR (yumuşak tiklemez): harcanan dakikalar bir
"yara" olarak flaşlar (`+40 min`, `key={round(elapsedMin)}` ile `@keyframes wound`), ufuk
çubuğu ileri atlar. Isı elapsedMin ile monoton yükselir (amber→ember→red, `--heat` custom
prop, STAGE SINIRI YOK — elapsedMin public). Sevk kurulunca ufuk somut ETA'ya çözülür:
"AMBULANCE DISPATCHED · arriving 06:XX". `AMBULANCE_ETA_MIN=240` bir istemci display
sabiti (wallClock'un "02:00'de başlar" şekeri gibi); ETA "~06:XX" olarak yaklaşık — motor
aritmetiğini ima etme (clockMax'te vaka önce bitebilir). Mobil: kompakt saati sticky
MobileVitalsStrip'e ekle (yoksa transkriptte kayıp gider).

### 3 · YAŞAYAN MONİTÖR  ·  M · P0
Statik tanım-listesi → **başucu monitörü, turlar arası görünür canlı.** Her vital bir
monitör satırı: büyük segmented tabular sayı + küçük birim + **tur-başı DELTA çipi**
(▲8/▼1/–) + değişen sayıda kısa FLAŞ + gözlenen-only trend sparkline'ı (SADECE tur-tur
görülen değerler). Kritik değerler ALARM (yavaş motion-safe pulse). **Ağrı satırı tuzağı:**
perforasyonda ağrı ▼ (indi) ama HR/ateş ▲ (tırmandı) aynı karede — delta nötr-tonlu, düşen
ağrı ASLA yeşil/iyi-haber değil. Uygulama: TEK yeni `vitalsLog` state'i (applyStateHeader'da
`{atMin, vitals}` ekle, initialVitals'la seed, session zarfına ekle → SESSION_V bump);
delta = current − önceki gözlenen; sparkline = vitalsLog üstünde map. `toFixed(precision)` +
ton mantığını KORU. Flaş `key={v.key-elapsedMin}` remount ile. Mobil: strip'e value+delta+
flaş, sparkline'ı at.

### 4 · KISIT PANOSU (kıtlık ledger'ı) + RED ANI  ·  M · P0
Renkli-nokta lejantı → **fiziksel kıtlık defteri, iki karşıt bölge:** VAR sütunu ("In the
room tonight" — sabit, ışıklı) vs YOK sütunu (CT/USG/Cerrah/PICU — üstü çizili/kilitli
kapılar, her biri authored "neden"iyle: *"no scanner here — nearest hours away"* birinci
sınıf caption). Sonra **red bir AN olarak sahnelenir:** oyuncu olmayan kaynağa uzanınca
transkriptteki istek üstü çizilir + damga bindirilir ("UNAVAILABLE HERE", scale+fade,
rotate -4°), VE eşleşen YOK satırı bir kere kırmızı flare edip kilitlenir (transkript
damgası + satır pulse'ı AYNI ANDA). Veri hazır: `constraintBoard[]` (status'a göre böl),
`entry.meta.attempted[].reason` (authored red gerekçesi zaten header'da). action→resource
haritası `actionCatalog[].requiresResource` (public). Opsiyonel yaşayan-dolum: kullanılan
VAR satırlarına "· used T+N". Mobil: transkript damgası birincil beat (pano aside altta),
damga tek başına durabilmeli.

### 5 · TRANSKRİPT = koğuş kroniği  ·  M · P1
Chat-log (baloncuk/"You" çipi) → **tek dikey KRONİK, aşağı kanayan zaman.** Sol kenarda
ince zaman-omurgası; her giriş bir düğüm, `wallClock(entry.atMin)` ile damgalı (02:00→02:15→
02:55). Dünya anlatısı = ODA KONUŞUYOR: kutusuz, sıcak-ışıklı serif prose, cömert satır
arası. Oyuncu turu = sessiz ORDER-LOG satırı (mono, omurgaya flush, "You" çipi/baloncuk YOK).
Meta bir zaman-olayı olur: dk-maliyeti saatin aldığı yara ("clock → 02:15 · +15 min"), red
istek omurgada asılı kalan bir kapalı kapı. Üst/alt fade maskesi (metin karanlıktan çıkar).
Streaming/scroll/historyText/CONNECTION_NOTE mantığına DOKUNMA; sadece re-layout. Veri hazır
(`atMin` her girişte kod-damgalı, hiç gösterilmiyor). Mobil: rail'i inline timestamp'e indir.

### 6 · VIGNETTE / hasta kartı editoryal  ·  M · P2 *(read-view reskin'i P0 değeri taşır)*
Jenerik gri panel → **set tipografi tanıklık:** annenin sözleri büyük, yakın, insani serif
(`--font-vignette`), esse gibi atıflı; hasta bir ÇOCUK (isimli 7 yaş, kilo fısıltı) — tag
çipleri değil. **Bu on-camera ödül (read-view) FL1.** Yazar affordance'ı (FL2 adayı):
istemci-only `editorial` override, derived `view` nesnesi (kart caseData yerine view'dan
render), AYRI localStorage anahtarı (`salus-editorial-v1`, frozen session'dan bağımsız),
`?author` flag'i arkasında (jüri/video temiz read-view görür). Voice preset'leri (Anne/Baba/
Nöbetçi notu). **Hiçbir authored metin bir fetch'e girmez** → sızıntı-geçirmez. Yardımcı:
"Presentation only — keep it true to Emir." Sert güvenlik: tanı-kör kal.

### 7 · DEBRIEF = başhekimle şafak (MONEY SHOT)  ·  L · P0  *(en büyük cila bütçesi)*
Tek gri rapor-kartı → **dramatik ağırlığa göre yeniden sıralanmış hesaplaşma:**
(1) **REVEAL töreni** — "The truth, hidden until now" eyebrow + tanı büyük serif display
olarak adlandırılır (blur-in), gizli tutulan gerçeğin ödülü. (2) **VERDICT** — ScoreGauge
büyütülmüş, mount'ta dolum-süpürmesi + count-up, ve **ÜÇ eksen INLINE** altında bar olarak
(Timing 54/60 · Discipline 20/25 · Differential 11/15) — "satır-satır kod-hesaplı" `<details>`
açmadan görünür. (3) **THE ONE THING** — ince-hata bulgusu bullet listesinden ÇEKİLİP başlık
kartı olur, gerçek saat aritmetiğiyle: *"Referred at 02:47 — the window closed at 03:30.
Right call, forty-three minutes late."* (`referralStartedAtMin`/`referTargetByMin`/`wallClock`
zaten payload'da). (4) güçlü/maliyet sessiz sütunlar. (5) **THE OTHER PLAYBOOK** — resourceLesson
+ ctContrast tek editoryal kapanış paneli, en çok tipografik özen (bu sim'in öğrettiği tez).
Ortam gece→şafak ısınır (uygulamadaki tek ışık dönüşü). Tam aritmetik ikincil `<details>`'te
(dürüstlük). Veri tamamen `DebriefData`'dan, sadece caseOver sonrası — hiçbir şey erken
render edilmez.

### 8 · KAPANIŞ MİSYON kartı  ·  S-M · P1
(yok) → cold-open'ı BOOKEND eden kapanış: aynı near-black, misyon satırı büyük ("Not 10 out
of 10 children. But even 1 out of 10 will be healed. For the impossible."), repo + "Open
source · AGPL-3.0 · Built with Claude Code" tasarlanmış end-card olarak (nötr-600 footer
değil). Debrief sonrası ulaşılabilir. Video kendi end-card'ını sağladığı için P1.

---

## 7 · SIRALAMA / ÇALIŞMA PLANI (kamera-önce, fazlı)

> Her fazdan sonra: `pnpm typecheck && pnpm build` temiz · telefonda bak · `dist` grep
> (tanı 0, `drift` 0) · altın E2E hâlâ oynanır. Sızıntı-geçirmezlik render katmanında
> yapısal olarak garanti — o yüzden son günlerde hızlı gitmek GÜVENLİ.

- **FAZ 0 — Temel (yarım gün):** §6.0 gece atmosferi + `@theme` token/font/keyframe
  sistemi. Seçilen yönün paleti/tipografisi buraya girer. *Her şey buna dayanıyor.*
- **FAZ 1 — P0 kamera anları (ana blok):** §6.7 Debrief (en büyük bütçe) → §6.4 CT-red +
  kısıt-panosu → §6.2 Saat → §6.3 Monitör → §6.1 Landing. **Bu bittiğinde video omurgası
  çekilebilir.**
- **FAZ 2 — P1 (cila):** §6.5 koğuş kroniği → §6.6 vignette read-view → §6.8 kapanış kartı.
- **FAZ 3 — FL2 / izin sonrası:** vignette yazar-modu affordance'ı, yapılandırılmış
  editoryal public alanlar, ikinci vaka (DKA), view-transition koreografisi, formal
  tasarım-token sistemi.

---

## 8 · NE YAPMA (özet)
Motoru dondur (`functions/**`) · `import type`'ı value import yapma · `drift`/gelecek-stage
istemcide kurma · debrief'i prefetch etme, caseOver öncesi reveal render etme · availability
toggle'ı yapma · `historyText` string'lerini değiştirme · vital sayılarını ara-değere anime
etme · ağır motion/font dep ekleme · kapsamı FL2'den FL1'e çekme.

---

## 9 · ŞAHİN'İN VERECEĞİ KARARLAR (yeni sohbet bunları sorsun)
1. **Estetik yön:** Tavsiyem **B (Humane Documentary) omurga + C (Clinical) enstrüman
   modülü + hero'da bir tutam A (Cinematic)**. Onaylıyor musun, yoksa saf bir yön mü?
2. **Referans/ruh:** bir film karesi / uygulama / ekran görüntüsü var mı? (yön netleşir)
3. **Webfont:** vignette için **Newsreader** (self-hosted, ~34-55KB) — değer mi, yoksa
   sistem-serif stack (sıfır maliyet) yeter mi?
4. **Yazar affordance'ı** (§6.6) FL1'de mi (bu hafta) yoksa FL2'de mi (izin sonrası)?
   Read-view reskin'i her hâlükârda FL1.
5. **Somut UI şikayetleri:** prod'da (Gün 4 canlı) gözüne batan spesifik şeyler? (Gün 4'ten
   devreden açık kalem)

---

## 10 · KAPANIŞ

Motor sinematik; şimdi ona bir yüz veriyoruz. Bu plan tek şeye hizmet ediyor: jürinin 3
dakikalık videoda ve bir URL'de, motorun zaten sunduğu **"kimsenin gelmediği o geceyi"**
sonunda HİSSETMESİ. Fazlası değil, eksiği hiç değil — ve motora tek satır dokunmadan.

> *"Farklılaşmayan şey yüzeydi, altındaki değil. Güzelleştirmek = zaten var olana bir yüz vermek."*

O 1 çocuk için. Yürüyoruz, dostum. 🤍

*— Hazırlayan: Claude · 15-ajanlı tasarım keşfi (wf_483245c2: denetim + vizyon + kamera +
fizibilite → 3 yön → 8 reçete) · Gün 4 gecesi · Motor donuk, yüzey özgür.*
