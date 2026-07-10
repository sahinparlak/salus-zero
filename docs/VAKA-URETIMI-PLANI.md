# SALUS Zero — Vaka Üretimi (Case Generation): Karar-Hazır Plan

## 0. Ne ve Neden — Tek Paragraf

Bugün SALUS Zero tek bir el-yazımı vakayı (apandisit) oynatıyor: skorla, debrief et, bitir. Motor kusursuz, doğrulanmış, deploy edilmiş — ama ürün "herkesin yapabileceği bir sınav-quizi" gibi okunuyor ve senin asıl vizyonun olan **dinamik vaka üretimi**ni bıraktı. Bu plan onu geri getiriyor: bir hekim kendi gerçekliğini tarif ediyor (hastanın yaşı/şikayeti + *kendi hastanesinde ne var ne yok*), ve **Claude o profil etrafında tutarlı, kötüleşen, kaynak-kısıtlı bir vaka yazıyor** — mevcut motorun sıfır değişiklikle oynayabileceği tam bir CaseSpec. Bu, "bir vaka *oynatıcısı* değil, bir vaka *üretici*" farkını doğuruyor; Claude'u aynı üründe üç role sokuyor (YAZAR + DÜNYA-MOTORU + ATTENDING) ve rubriğin "Claude Use" eksenini vuruyor. Kritik kısıt: bu **eklemeli** olacak — doğrulanmış apandisit "kahraman" vakası demonun omurgası olarak kalacak, üretim ondan tamamen izole, her an terk edilebilir ikinci bir "wow" ritmi olacak. Bu belge, 4 günde, tek başına, klinik nöbetlerin üstünde, kahramanı asla riske atmadan bunun nasıl inşa edileceğinin somut planıdır.

---

## 1. Konsept — Claude Vakayı Üretir, Kaynak Profili Girdidir

**İki hareket:**

1. **CLAUDE VAKAYI YAZAR.** Hekim bir öncül veriyor (yaş bandı / ebeveyn ağzından şikayet / ortam), ve Claude — apandisit örneğini altın şablon alarak — yeni bir hastalık, gizli bir ground-truth, kötüleşen bir fizyoloji yayı ve kaynak-tutarlı bir skorlama grafiği yazıyor. Bu senin 1 numaralı orijinal özelliğindi.

2. **KAYNAK PROFİLİ KULLANICI-AYARLI, AMA CANLI TOGGLE DEĞİL.** Mimari olarak zaten anlaştığımız nokta: erişilebilirlik sabit bir vaka üstünde canlı bir anahtar *değil* (bu mühendislik ürünü gizli simülasyonu bozardı). Bunun yerine seçilen kaynak profili **üretimin girdisi** — Claude vakayı o profilin *etrafında* tutarlıca yazıyor. Hekim "CT'm var" derse, Claude CT'nin mevcut olduğu ama gerginliğin başka yere kaydığı bir gece yazıyor.

**Neden şimdi bu:** Motor zaten tamamen profil-güdümlü ve domain-agnostik. DecisionBox `resourceProfile.available`'a göre yatak-başı/telefon ayrımı yapıyor, sevk `requiresResource==='referral'` ile bulunuyor, monitör ve pano doğrudan public projeksiyondan render ediliyor. **Oyun arayüzü sıfır değişiklik istiyor** — bu, özelliği 4 güne sığdıran şeyin ta kendisi.

---

## 2. Mimari — Sunucu-Tarafı Üretim Yolu + Vaka Kalıcılığı

### 2.1 Tek yeni rota: `POST /api/generate`

Ürünün tek mevcut yapılandırılmış-çıktı çağrısını (`functions/api/debrief.ts`) birebir taklit eden **tek bir yeni worker rotası**. Girdi `{premise, resources}`, çıktı `{caseId, case: toPublicCase(spec)}`. Pipeline'ın tamamı `functions/api/generate.ts` içinde, tamamen sunucu-tarafı:

1. **İstek Zod-doğrulaması.** `GenerateRequestSchema = { premise:{ ageBand, complaint (pick-list), setting? }, resources:{ available:string[], unavailable:string[], referralMinutes } }`. Bu hekimin checkbox seçimi — tam bir `resourceProfile` DEĞİL. Claude tam profili/constraintBoard'u/id-grafiğini bunun *etrafında* yazıyor.

2. **Anthropic çağrısı, `debrief.ts:158-176`'yı birebir yansıtarak.** `api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`. **Model kararı:** üretim için yeni bir `GEN_MODEL_ID` env (varsayılan `claude-opus-4-8`) — bu nadir, gecikme-toleranslı bir yazım çağrısı, kalite önemli; sıcak tur-başı yol `MODEL_ID`'de kalır. `thinking: {type:'adaptive'}`, `effort:'high'` (`max` değil), non-streaming, `max_tokens ~10-12k`, `debrief.ts`'in kullandığı **aynı 1-retry döngüsü** (hatayı retry'da geri besle).

3. **KRİTİK ŞEMA BULGUSU — CaseSpecSchema'yı json_schema'ya doğrudan veremezsin.** Strict yapılandırılmış çıktı her nesnede `additionalProperties:false` + `required` dayatıyor (doğrulandı: `debriefPrompt.ts:19`), `minItems/maxItems` ve sayısal `min/max` yasak. Ama `StageSchema.labs` bir `z.record(z.string())` — açık anahtarlı bir map — strict şema bunu ifade *edemez*. Ayrıca sum-to-15 kuralı ve artan stage tetikleyicileri json_schema'nın yakalayamadığı çapraz-alan invariantları. **Çözüm:** `GEN_CASE_SCHEMA`, CaseSpec'in bir **dönüşümü** olacak — `labs` bir `{actionId, result}` dizisi olur (sabit-şekilli nesne), tüm sayı/aralık limitleri şemadan çıkıp prompt'a taşınır, `safety.illustrative` için `const:true` (const desteklenir), 6-anahtarlı vitals nesnesi ve tüm enum'lar temiz eşleşir.

4. **`assembleCaseSpec(gen, sessionId, resources)`** — saf kod: (a) `labs` kayıtlarını dizilerden yeniden kurar, (b) `id = sessionId` enjekte eder, (c) defaulted alanları doldurur, sonra **`CaseSpecSchema.parse(...)` son yapısal kapıdır** — kahraman vakayla birebir aynı kontrat.

5. **`validateGeneratedCase(spec)`** — Zod'un göremediğini zorlayan deterministik kod (bkz. §4).

6. **Başarıda:** `env.CASE_STORE.put(sessionId, JSON.stringify(spec), {expirationTtl: 6h})`, yanıt `200 { caseId: sessionId, case: toPublicCase(spec) }`. **`toPublicCase` TAM OLARAK BİR KEZ, doğrulanmış tam spec üstünde, yanıttan hemen önce uygulanır** — `case.ts:17`'deki aynı projeksiyon boğazı.

### 2.2 Kalıcılık — Workers KV (somut)

Bugün `wrangler.toml` sıfır binding taşıyor (KV/DO/D1 yok; yalnızca `ANTHROPIC_API_KEY` + `MODEL_ID` secret'ları). Motor tur-arası **stateless**: client yalnızca `caseId` string'i + sim sayıları + history taşıyor, tam spec her istekte `getCase(caseId)` ile sunucu-tarafı yeniden türetiliyor. Üretilen vaka statik registry'de olmadığından bugün `turn.ts:91`'de 404 alır.

**Çözüm — Workers KV (projenin İLK binding'i):**
- `wrangler.toml`'a `[[kv_namespaces]] binding = CASE_STORE` ekle.
- `getCase(id)` → **`async getCase(id, env)`**: `Object.hasOwn(cases, id)` ise kahraman (registry-first); değilse `raw = await env.CASE_STORE.get(id)` ? `CaseSpecSchema.parse(JSON.parse(raw))` : `undefined`.
- `env`'i 3 çağrı noktasında geç: `case.ts:13`, `turn.ts:90`, `debrief.ts:115` — üçü de zaten `async` PagesFunction handler'ları, `ctx.request.json()`'ı zaten await ediyor, yani düşük-risk.
- **FAIL-SAFE (keskin kenar):** KV miss/TTL-expiry → **404 'case expired'**, ASLA sessizce `DEFAULT_CASE_ID`'ye düşme. Yoksa üretilmiş bir oyun apandisit ground-truth'una karşı skorlanır ve debrief edilir — kamerada başka bir çocuk için apandisit debrief prozası çıkar. Bu kesin.

**Neden KV, DO/D1/blob değil:** Bu bir session içinde write-once-read-many (bir yazar, sonra saniyeler içinde okur) — KV'nin eventual consistency'si burada kabul edilebilir. TTL terk edilmiş session'ları otomatik siler. Sırrı sunucu-tarafında tutar, tam registry gibi. Durable Objects strong consistency verir ama DO class + migration ister (4-gün için aşırı). D1/R2 daha ağır. Cache API per-colo, tur-arası güvenilmez. **Client-taşımalı şifreli blob ASLA** — imzasız spec network tab'ında ground-truth'u ifşa eder, AES-GCM bile ciphertext'i tarayıcıya geri sokar (kutsal off-client sınırına karşı) ve güvenliği kusursuz kriptoya bağlar.

### 2.3 Leak-Safety Kanıtı (açık)

Sınır içerik-agnostik tek bir mekanizmayla korunur: **`toPublicCase()` (`caseSpec.ts:157-176`) 10 adlı alanı kopyalar ve geri kalan HER ŞEYİ düşürür** — `domain`, `stages[0].vitals` dışındaki her şey (tüm gelecek stage'ler, examFindings, labs string'leri, pas), `groundTruth`, `scoringSignals`, `debrief`, ve her vital'ın `drift`'i. Bu, vaka içeriğinden BAĞIMSIZ. Dolayısıyla üretilmiş bir spec için de yapısal sızıntı yüzeyi tek bir grep'lenebilir, test'lenebilir satıra iner:

> **Yapısal invariant:** `generate`'in yanıt gövdesi `toPublicCase(spec) + {caseId}` ile deep-equal olmalı, fazlası değil. Bir unit test'le assert et. Ham spec'i asla bir client payload'ına veya `x-salus-state` header'ına `JSON.stringify` etme.

**Tek YENİ sızıntı yüzeyi yapısal değil, SEMANTİK:** allowlist'li bir public alan (title, vignette, action label/keyword, constraintBoard detail) tanıyı *isimlendirebilir* — Zod `title:'Akut Apandisit'`'i mutlulukla kabul eder. Bunu allowlist kapatamaz. İnsan yazar elle kapatmıştı (kahramanın keyword'leri 'appendix'ten kaçınır). Bunu §4'teki tanı-nötr tarama + insan-vetting kapatır. `drift` zaten güvenli — `toPublicCase` onu striper, yani `drift:'step'` tuzakları worker-tarafında kalır.

---

## 3. Kaynak-Yazım UX + "CT İsteyemezsin" Tezinin Her Profilde Hayatta Kalması

### 3.1 Kurulum ekranı — ColdOpen'ın yanında ikinci bir kapı

Mevcut ColdOpen "Gecenin nöbetine başla" (kahraman omurga + sert fallback) DOKUNULMADAN kalır. Altına daha sessiz ikinci bir kapı: **"…ya da kendi hastaneni anlat."** Üç grup toplar:

- **GRUP 1 — Öncül (hafif, 3 alan):** yaş bandı (bebek/yürüme/okul-çağı/ergen → `patient.ageYears` + `weightKg`), şikayet bir **PICK-LIST** (karın ağrısı, solunum sıkıntısı, uyanmıyor/letarji, düşme sonrası yaralanma, ateş+beslenmiyor, nöbet) — asla bir tanı değil, **ebeveyn ağzından bir ŞİKAYET**, yani public title/vignette yapısal olarak tanı-nötr. Serbest-metin şikayet YOK (sızıntı yolunu ve bir doğrulama dalını siler).
- **GRUP 2 — Tanısal kaynaklar (tercihen tri-state):** "Evet, 7/24" / "Sadece gündüz — bu gece değil" / "Hayır, asla". Satırlar: CT, ultrason (sonografçıyla), düz röntgen, merkez lab (CBC/kimya), yatak-başı stripler (glukoz+keton, idrar). Eşleme: 7/24 → `available` + status `available`; bu-gece-değil → `unavailable` + status `delayed` ("cihaz burada, teknisyen 08:00'de gelir"); asla → `unavailable` + status `unavailable`. Bu doğrudan `loop.ts:169` reddini sürer, sıfır motor değişikliği. **"Bu gece değil" hali, CT-SAHİBİ bir hastanenin bile 'CT isteyemezsin'i dürüstçe oynamasını sağlayan şey** — çünkü gece 3'te gerçekten isteyemezler, kendi itiraflarıyla.
- **GRUP 3 — İnsanlar/definitif bakım (MVP: salt-gösterim "bu gece yerinde cerrah/OR yok" — `prompt.ts:45`'i doğru tutar; STRETCH: checkable).**
- **GRUP 4 — Transfer gerçekliği (ZORUNLU, 60-puanlık eksen):** "ambulansın sana ulaşma süresi" slider'ı 30 dk → 6 saat → `referralMinutes`. Bu girdi asla "her şeyimiz var" olamaz — hiçbir şey transfer etmeyen hastane ZATEN üçüncü basamak merkezdir. Bunu yakalamak, tezin her zaman bir yuvası olmasını garantiler.

### 3.2 Tez neden her profilde hayatta kalıyor — asıl kavrayış

Motorun skorlaması aslında görüntüleme hakkında değil, **DEFİNİTİF BAKIM** hakkında. `score.ts` 100 puanın 60'ını sevk-zamanlamasına sabitliyor (`TIMING_MAX=60`) ve vaka-bitiren aksiyonu salt `requiresResource==='referral'` ile buluyor. "Burada ameliyat et" için bir skorlama şekli YOK. Yani tez, kısıtlığı hekimin girdilerine *zorlamakla* değil, üretimin *yazdığı şeye* konan bir invariantla korunuyor:

> **Hastanın definitif ihtiyacı, hekimin bu gece yerinde yapabileceğini HER ZAMAN aşar; ve transfer-zamanlaması derecelendirilen karar olarak kalır.**

Tanısal kısıtlık (CT/US/lab) serbestçe kayabilir; definitif kısıtlık yük-taşıyan eksen ve inşa yoluyla garanti. Kısıtlık kodun zaten desteklediği DÖRT vektörle kayıyor:

1. **DEFİNİTİF-İHTİYAÇ-PROFİLİ-AŞAR (garanti).** Üretim, definitif tedavisi hekimin en iyi yerinde-kapasitesini aşan bir gizli tanı seçer: cerrah yok → herhangi cerrahi karın; genel cerrah ama pediatrik cerrah yok → yenidoğan/bebek cerrahi problemi; cerrah+OR ama PICU yok → yoğun-bakım isteyen bir ameliyat. Bu boşluk HER ZAMAN kurulabilir çünkü yerinde-profiller sonlu, akutluk üretici-kontrollü serbest değişken.
2. **GECE-KAPISI ("radyolog yok" kayması).** Grup-2 "var ama bu gece değil" tri-state'i, sahip olunan bir kaynağı `unavailable` + `delayed`'a taşır. CT sahibi hekim bile görüntülemenin tempoyu belirleyemediği bir gece oynar — klasik `await_morning_us` bekleme-tuzağı (`score.ts` WAIT_PENALTY −15) *onların kendi* kaynağı üstünde yazılır. Dürüst, asla bait-and-switch değil.
3. **MESAFE-ZAMAN (kahramanın vektörü).** `referralMinutes` transferin kendisini dram yapar (kahramanda 240 dk).
4. **KÖTÜLEŞME-HIZI (bolluk-VE-yakın köşe kurtarıcı).** 30-dk transfer + tüm tanısallar elde olduğunda, üretim yayı sıkıştırır: sıkı `referTargetByMin` + hızlı stage tetikleyiciler, tanınması zor hızlı-öldüren bir durumda (torsiyon organ-ölüm saati, `drift:'step'` yazılmış gizli-perforasyon yalancı-rahatlama uçurumu). 30-dakikalık ambulans bile mesafeye değil *tanımaya* karşı bir yarış olur.

**ANTİ-QUIZ TABANI (üç dejenerasyon koruması):** (i) transfer girdisinde "anında" seçeneği yok, (ii) definitif-ihtiyaç invariantı yol üstünde ≥1 kritik-unavailable kaynağı zorlar, (iii) üretim hastanın gerçekten ihtiyaç duyduğu en az bir unavailable kaynak içeren profil emit etmeli. UX bunu dürüstçe söyler: *"Neyin var, söyle. Geceyi, bu çocuğun ihtiyaç duyduğu ama sende olmayan tek şeyin etrafında kurarız — her gerçek gecenin bir tane vardır."*

---

## 4. Klinik Tutarlılık + Güvenlik + Cerrah-Küratörlük

Örgütleyen kavrayış: `appendicitis-rural.ts` ~400 satırlık bir eser, **7-agent'lı workflow + cerrah imzasıyla, günler boyunca** üretildi. Claude'dan bu kaliteyi tek çağrıda, kör, 4 günde yeniden üretmesini beklemek asıl risk. Strateji: **Claude'un serbest yazdığı yüzeyi küçült**, ve emit ettiği her şeyi önce deterministik kod, sonra olasılıksal klinik eleştirmen, sonra insan üstünden geçir. En ucuz/en-deterministik önce, 6-katmanlı yığın:

- **L0 — ÜRETİM YÜZEYİNİ DARALT (en büyük tutarlılık kaldıracı).** Claude'dan 16 üst-alanlık klinik fiziği sıfırdan uydurmasını İSTEME. `appendicitis-rural.ts`'i **altın şablon** al, üretimi invariantları önceden-pişmiş sabit bir iskeleti doldurmaya kısıtla: ~4 stage S0..S3 (S0=0, artan tetikleyiciler), stage başına 6 vital, `available`'da tam bir `requiresResource:'referral'` aksiyonu, sum-to-15 differential puanları, discrete-event vital'da `drift:'step'`. Model HASTALIĞI yeniden yazıyor, YAPIYI değil.
- **L1 — KISITLI ÜRETİM PROMPT'U** örnek üstünde topraklanmış: Claude'a tam apandisit spec'i işlenmiş örnek olarak ver ("bu öncül + bu resourceProfile için AYNI şekilde YENİ bir vaka yaz"), sert invariantları açık kural olarak, kahramandan damıtılmış doktrini (kötüleşen yay, yalancı-rahatlama tuzağı, yalnızca profilin araçlarıyla mimic dışlaması, sevk-zamanlama menteşesi, İLAÇ DOZU YOK, `illustrative:true`, tanı-nötr public metin).
- **L2 — ŞEMA/ENUM ZEMİNİ.** `CaseSpecSchema.parse()` yanlış tipleri/enum'ları/eksik alanları/`illustrative!==true`'yu otomatik reddeder. %100 deterministik, bedava.
- **L3 — POST-PARSE `validateGeneratedCase(spec)`** — Zod'un göremediği her şeyi zorlayan saf kontrolcü: artan stage tetikleyicileri (S0=0); TAM OLARAK bir `requiresResource==='referral'` VE `available`'da; differential puanları 15'e toplanıyor; her id çapraz-referansı çözülüyor (`requiresResource ∈ available∪unavailable`; `differentialActions/waitActions/blindCommit.anyOf` → gerçek action id'leri; `forbiddenResources ⊆ unavailable`; constraintBoard profili aynalıyor); her differential/blindCommit action bu profilde *performable*; stage başına 6 vital mevcut; `referTargetByMin`, toplanan workup `baseTimeCostMinutes`'a göre ulaşılabilir; ARTI tanı-SIZINTI taraması (tam terim + eşanlamlı + eponim, word-boundary, case-insensitive) tüm public string'lerde; ARTI doz-deseni regex taraması (mg/kg, birim+sayı). Deterministik → asıl güvenlik ağı. Ya geçer ya session hiç yaratılmaz.
  - **Regresyon çıpası:** `validateGeneratedCase(appendicitisRural)` GEÇMELİ — kahraman, kontrolcünün kendi unit-test fixture'ı, kapının bilinen-iyi'yi asla reddetmediğini ve 100-puan ölçeğine kalibre olduğunu kanıtlar.
- **L4 — SELF-CRITIQUE KLİNİK PASI** (STRETCH) — `debrief.ts`'in tam yapılandırılmış-çıktı şeklini yeniden kullanan İKİNCİ bir Claude çağrısı, tam (worker-only) spec üstünde adversaryel klinik gözden geçiren, `{verdict:'pass'|'revise'|'reject', clinicalErrors[], leakFindings[], safetyFindings[]}` döndüren. Kodun yakalayamadığını yargılar: fizyoloji/lab/exam yörüngesi iddia edilen tanı için makul mü, mimic'ler gerçek mi, bir public alan tanıyı semantik olarak ima ediyor mu, gerçek bir doz kaydı mı. 'revise' → bir onarım turu; 'reject'/tekrar-başarısız → kahramana fallback.
- **L5 — CERRAH GÖZDEN GEÇİRME / KÜRATÖRLÜK / KAYDET** — L2-L4'ü geçen bir spec Şahin'e okunabilir olarak gösterilir (tam gizli spec). **Accept, onu efemeral session store'dan `functions/cases`'e statik bir dosya olarak el-commit'ler** — kahramanla birebir aynı registry muamelesi, SIFIR runtime riski. On-camera de-risker'ın ta kendisi bu.

**DEMO İÇİN:** tüm L0-L5 pipeline'ı bir gün önce KAMERA-DIŞI çalıştırılıp 2-3 vaka vet edilir, statik kaydedilir. Canlı üretim tek bir gösteriş ritmi olarak, vet edilmiş set + kahraman fallback silahlıyken gösterilir.

---

## 5. Demo Entegrasyonu + Kahraman İzolasyonu + Rubrik Kazancı

### 5.1 Öneri: SUBMIT edilen video için PRE-VETTED üretim (canlı değil)

Skorlanan tek şey deterministik ve yeniden-çekilebilir olmalı. Canlı üretim yavaş olabilir, Zod parse'ta düşebilir, allowlist'li bir label'da tanı sızdırabilir, klinik olarak yanlış olabilir — hiçbiri skorlayan tek çekimde hayatta kalmaz. **Ama otantik yakala:** hekimin "hastaneni anlat" formunu doldurmasını kamerada çek (duygusal ritim BU), kısa bir "Claude vakayı yazıyor…" durakla, sonra **Claude'un tam o girdiden bir gün önce gerçekten ürettiği** bir vakayı göster. "Claude bunu üretti" iddiası birebir doğru kalır; yalnızca network round-trip'ini de-risk edersin.

### 5.2 Kahraman-İzolasyon Sınırı (kodda topraklanmış)

Kahraman ve üretim motoru paylaşır ama tam iki dikişte ayrılır:
1. **GİRİŞ:** `beginCase()` (`App.tsx:304`, `/api/case` no-id → `DEFAULT_CASE_ID`) birebir varsayılan kapı kalır. Üretim YENİ paralel bir `beginGeneratedCase(publicCase, id)` — aynı `streamInto`/`applyStateHeader`/`sendTurn` makinesini yeniden kullanır, farklı `caseData`+`id` tohumlar. Kahraman yolu `/api/generate`'i asla çağırmaz, KV'ye asla dokunmaz.
2. **GERİ-ALIM:** `getCase` registry-first / store-fallback olur — kahraman her zaman compiled-in registry'den çözülür, sıfır yeni bağımlılık. KV kesintisi, kötü üretim, `/api/generate`'de 500 kahramanı KIRAMAZ.

**BELT-AND-SUSPENDERS:** BİR pre-vetted üretilmiş vakayı statik registry'ye (`cases/index.ts`) kendi id'siyle (örn. `'night-with-a-ct'`) yükselt. O zaman demonun "üretilmiş" vakası kahramanla AYNI güvenilirliğe sahip — compiled-in, KV yok, canlı API yok — canlı `/api/generate`+KV yolu meraklı jüri için var olurken.

### 5.3 Video Çekim Listesi (3:00)

- **0:00–0:30 SOĞUK AÇILIŞ** — mevcut ColdOpen ("02:00… CT yok. Sonografçı yok. En yakın cerrah sensin."). Tez + kanca, zaten inşa+doğrulanmış.
- **0:30–1:30 KAHRAMAN OYUN** — apandisit: lab iste, CT'de "Burada mevcut değil" damgasını ye (imzalı ritim), saat sıçraması, yalancı-rahatlama ağrı uçurumu, sevki commit et. DEPTH + çalışan motor + tezin duygusal inişini kanıtlar.
- **1:30–1:45 DEBRIEF** — skor + attending prozası + CT-karşı-olgu paragrafı. Döngünün kapandığını kanıtlar.
- **1:45–2:00 PİVOT** — "Ama her kırsal hastane farklı kısıtlı. Ya hekim KENDİ gerçekliğini anlatırsa?" Forma kes.
- **2:00–2:40 ÜRETİM RİTMİ** — checkbox'ları çek: "CT'm var… ama cerrah yok, en yakını 3 saat." Yaz'a bas. "Claude vakayı yazıyor…". YENİ vaka: farklı hasta, farklı kısıt panosu — CT artık MEVCUT, ama kısıtlık cerrah-yok + transfer-süresine KAYMIŞ. Gerçek kötüleşen sim olduğunu kanıtlamak için 2-3 tur oyna.
- **2:40–3:00 KAPANIŞ** — aynı motor, sonsuz hastane; "bir vaka OYNATICI değil, bir vaka ÜRETİCİ"; ahit satırı.

Sıralamanın nedeni: GÜVENİLİR kahraman önce gider ve tüm videoyu de-risk eder (üretim görüntüsü hayal kırıklığı yaratsa bile 90 saniye kanıtlı ürünün var).

### 5.4 Rubrik Eşlemesi

- **CLAUDE USE 25 ("bizi şaşırttı")** — üretici manşet. Claude tek üründe ÜÇ rol oynuyor: YAZAR (tek satır öncülden gizli ground-truth + kötüleşen fizyoloji + kaynak-tutarlı skorlama grafiği icat eder), DÜNYA-MOTORU (o gizli simi serbest-metin kararlar üstünde oynar), ATTENDING (debrief yazar). "Sınavı üretir VE derecelendirir VE ondan öğretir" sürprizidir.
- **IMPACT 25 ("hekimin gerçek kısıtları")** — kullanıcı-ayarlı kaynak profili impact kaldıracı: sim O hastanenin gerçekten sahip olduğuna uyum sağlar. Kırsal Anadolu'daki bir hekim ve Sahra-altı Afrika'daki bir hekim, her biri ilgili bir vaka alır. Kısıtlık kayar, asla yok olmaz.
- **DEMO 30** — kahraman-önce dizisi demo stratejisinin ta kendisi: kanıtlı omurga + farklılaştırıcı crescendo, her iki vaka da registry-destekli olduğundan deterministik.
- **DEPTH 20** — üretim ritminde AYNI "X isteyemezsin" gerginliğinin bolluk işaretlendiğinde yok olmak yerine tutarlıca KAYDIĞINI göstererek servis edilir.

---

## 6. Fazlı, Zaman-Kutulu ~4 Günlük İnşa Planı (her kapıda kahramana sert fallback)

**Bağlam:** Bugün 9 Jul, teslim 13 Jul 21:00 ET → ~4 gün, tek başına, klinik nöbetlerin üstünde. Tasarım agent'larının kendi tahminleri sıfır boşlukla tüm bütçeyi topluyor ve en büyük riski hafife alıyor: **üretim-prompt-artı-validator iterasyon döngüsü ön-yüklü, sınırsız belirsizlik** — Claude'un deterministik kapıyı güvenilir geçen bir spec emit etmesine kaç tur gerektiğini bilemezsin.

**FAZ 0 — DONDUR (30 dk, ilk iş).** Doğrulanmış commit'i (`387809b`) tag'le/branch'le. Kahraman + motor byte-for-byte kurtarılabilir. Paylaşılan motor dosyalarına (`appendicitis-rural.ts`, `score.ts`, `loop.ts`, `stage.ts`, `prompt.ts`, `caseSpec.ts` şeması) özellik için DOKUNMA — üretim yalnızca dosya EKLER.

**FAZ 1 — Üretim çekirdeği (Gün 1, zaman-kutulu).** `functions/api/generate.ts` + `GEN_CASE_SCHEMA` dönüşüm şeması + L1 üretim prompt'u (örnek üstünde topraklanmış) + `assembleCaseSpec` + `validateGeneratedCase` + regresyon çıpası testi. Anthropic çağrısı `debrief.ts` şeklini yansıtır. **Bu, prompt+validator — asıl maliyet, plumbing değil.**
> **SERT GÜVENLİK VALFİ:** Üretimi Gün 1'e zaman-kutula. **Gün 2 SONUNA kadar** deterministik oynayan BİR vet edilmiş, registry-yükseltilmiş vakan yoksa, DUR ve yalnızca-kahramanı ship et. Kahraman tek başına tam, rubrik-skorlayan bir teslim.

**FAZ 2 — Vet et + yükselt (Gün 2).** Gerçek bir `/api/generate` çağrısını KAMERA-DIŞI, TAM demo girdisine karşı çalıştırıp BİR vaka üret. Şahin tam gizli spec'i okur (klinik + sızıntı vet). `functions/cases`'e statik dosya olarak el-commit et, kendi id'siyle. **Bütünlük koruması: vaka gerçekten bir `/api/generate` çalışmasından gelmeli — el-yazımı olup "üretilmiş" deme.**

**FAZ 3 — Kurulum UX + client kablolama (Gün 2-3).** ColdOpen ikinci kapı + "hastaneni anlat" formu (pick-list öncül + ~5 checkbox + transfer slider) + `beginGeneratedCase()` mevcut makineyi yeniden kullanarak. Client herhangi `/api/generate` başarısızlığında düzgün degrade eder: `setError` + `setCaseData(null)` + `setPhase('idle')` → ColdOpen'a döner, "Gecenin nöbetine başla" retry görevi görür. Kurulum ekranı kahramana ulaşmak için ASLA zorunlu adım olmamalı.

**FAZ 4 — Video (Gün 3-4).** Kahraman-önce dizisiyle çek. Her iki vaka da mevcut SENKRON registry'den çözülür → KV yok, async yok, canlı-başarısızlık yok. Yeniden-çekilebilir buffer bırak.

**STRETCH (yalnızca video kutuda ise, bir branch'te) — Canlı KV yolu.** `[[kv_namespaces]]` binding + async registry-first `getCase` 3 çağrı noktasında + fail-safe 404'ler. Jüri Q&A kanıtı. **Video bağımlılığı DEĞİL.**

---

## 7. Dürüst Riskler + Red-Team Verdikti

### Red-team verdikti: **GO-WITH-CUTS**

Tasarım mimari olarak sağlam ve yapısal bir leak-safety kırığı bulunamadı: `toPublicCase()` içerik-agnostik allowlist, yani üretilmiş bir spec içerikten BAĞIMSIZ olarak fizyoloji/ground-truth sızdıramaz — koşulu: (a) üretim sunucu-tarafı, (b) `toPublicCase` yanıttan önce tam bir kez uygulanır, (c) ham spec asla client payload'ına/header'a `JSON.stringify`'lanmaz. Bu, tüm yapısal sızıntı yüzeyini tek grep'lenebilir satıra indirir. Plumbing (KV binding, async registry-first getCase) gerçekten düşük-risk. Motor zaten profil-güdümlü, oyun UI'ı sıfır değişiklik ister.

**AMA dürüst maliyet plumbing DEĞİL** — Claude'un Zod + çapraz-alan id-grafiği + sum-to-15 + tanı-nötr taramayı geçen VE kamerada klinik olarak makul 400 satırlık bir CaseSpec'i güvenilir emit etmesini sağlamak. Kahraman (394 satır) 7-agent workflow + günlerce cerrah imzası aldı. Tek çağrıdan tek-atışlık parite beklemek gerçekçi değil.

**Verdikt go-with-cuts, çünkü** gerçekten eklemeli, farklılaştırıcı-kanıtlayan bir versiyon ANCAK VE ANCAK demo canlı üretimden AYRILIRSA ulaşılabilir: BİR cerrah-vet edilmiş vakayı kamera-dışı gerçek bir `/api/generate` çağrısıyla önceden üret, statik registry'ye yükselt, otantik çek. Canlı KV yolu video-sonrası, jüri-Q&A stretch'i olur. Bu kesimler altında özellik Claude-Use crescendo'sunu (yazar + dünya-motoru + attending) doğrulanmış kahramanı asla riske atmadan inişe geçirir.

### Riskler (dürüst)

- **KLİNİK MAKUL-OLMAMA #1 on-camera risk, yalnızca olasılıksal yakalanır.** Zod + çapraz-alan validator YAPIYI %100 deterministik yakalar, ama fizyolojik olarak yanlış bir yörüngeyi, yaş/vitals uyumsuzluğunu (Zod yenidoğanda erişkin HR'ı kabul eder) veya gerçek yanıtı transfer olmayan bir tanıyı hiçbir deterministik şey yakalamaz. Rezidüel: arbitrary canlı öncül için orta-yüksek, cerrah-vet edilmiş vaka için sıfıra yakın. **Demo bu yüzden pre-vetted OLMALI.**
- **GÜVENSİZ İÇERİK** (gerçek ilaç dozu / tehlikeli manevra) yazılmış statik string'de. Motor rayları WORLD-ENGINE'in doz söylemesini yasaklar ama bu statik string'ler daha verbatim render edilir. Azalt: prompt doz yasağı + validator regex taraması + insan okuması.
- **TANI/SKORLAMA-ŞEKİL UYUMSUZLUĞU:** üretim, gerçek en-iyi aksiyonu transfer değil yerinde-yönetim olan bir tanı seçerse, vaka motorun 60/100 sabitlemesi için klinik YANLIŞ. Tanı UZAYI cerrahi-karın-off-site-definitif sınıfına kısıtlanmalı.
- **`prompt.ts:45` sabit satırları** ('yerinde cerrah/anestezi yok, definitif cerrahi imkansız' + 'CT şehirde, 4 saat uzakta') bir üretilmiş profil yerinde-cerrah verirse kamerada YANLIŞ olur. 4-gün: üretilmiş profilleri yerinde-definitif-bakım-yok tutacak şekilde KISITLA (validator yerinde-cerrah/OR'ı reddeder) — prompt'u bu döngüde parametreleştirme.
- **Yazar-cevabı-bilir:** aynı kişi tohumlar ve oynar. Train-a-colleague aracı için kabul edilebilir; jüri "oyuncu cevabı görüyor" okumasın diye çerçevele. Farklı bir oyuncuya asla gizli ground-truth ifşa etmez.
- **AŞIRI-KAPSAM kahramanı batırır:** 4 solo günde canlı KV + arbitrary-öncül + cilalı review UI kovalamak, doğrulanmış kahramanı yeniden-çekilmemiş bırakma riski. Azalt: video-güvenli minimumu ÖNCE inşa et.

### En kritik leak-safety kenarları
- **Tek-satır footgun:** `generate`'in `toPublicCase()`'i tam bir kez uygulaması. Bir dev "kolaylık için" tam spec'i döndürürse (veya loglarsa) her gizli alan bir anda sızar. Test'le: yanıt gövdesi `toPublicCase(spec) + {caseId}` ile deep-equal.
- **KV FAIL-SAFE (yalnız canlı yol):** miss/expiry'de sessizce `DEFAULT_CASE_ID`'ye düşülürse çapraz-vaka kontaminasyonu. 404 OLMALI, asla fall-through.
- **`drift` zaten güvenli** — `toPublicCase` striper. Validator yalnızca `drift`'in discrete-event vital'da SET olduğunu doğrular, sızmasını dert etmez.

---

## 8. Şahin'in Vermesi Gereken Açık Kararlar

1. **Video canlı mı, pre-vetted mi?** (Kesin öneri: **pre-vetted + registry-yükseltilmiş**, otantik çekim.) Bunu onaylıyor musun? Tüm faz planı buna dayanıyor.

2. **Tri-state mi, binary mi?** Grup-2 tanısal kaynaklar "7/24 / bu-gece-değil / asla" mı yoksa sadece "var/yok" mu? Tri-state "gece-kapısı" relokasyonunu (CT'si olanın bile 'CT isteyemezsin'i oynaması) verir ama daha fazla iş. Form erken inmezse binary'ye düş.

3. **Definitif bakım MVP'de sabit-yok mu?** (Öneri: **evet, sabit-yok** — `prompt.ts:45` doğru kalır, prompt parametreleştirmesi gerekmez.) Grup-3'ü checkable yapmak stretch — ilk kesilecek. Onaylıyor musun?

4. **Demo profili hangisi?** (Öneri: **"CT mevcut, cerrah yok, ~3 saat transfer"** — kahramanın "CT yok"una en keskin on-camera kontrast: kısıt panosu görünür yeniden düzenlenir ama karar (deadline-öncesi-transfer) merkezde kalır.) Kabul?

5. **Yaş bandı + şikayet pick-list'i.** Hangi 4-6 ebeveyn-ağzı şikayet? (Taslak: karın ağrısı, solunum sıkıntısı, uyanmıyor/letarji, düşme-sonrası, ateş+beslenmiyor, nöbet.) Ve hangi tanı-uzayı sınıfları klinik olarak onaylıyorsun (cerrahi-karın-off-site sınıfı)?

6. **Gün-2 kapısı.** Gün 2 sonunda deterministik oynayan bir vet edilmiş vaka yoksa yalnızca-kahramanı ship etmeye söz veriyor musun? Bu güvenlik valfi sözlü taahhüt gerektiriyor — rigor'un 4-günlük yükümlülük.

7. **`GEN_MODEL_ID`.** Üretim için Opus 4.8 (kalite, gecikme-toleranslı) onaylanıyor mu, yoksa maliyet/gecikme için tur-başı Sonnet'te mi tutalım? (Öneri: üretim için Opus, tur için Sonnet.)

8. **Canlı KV yolu.** Video kutuda ise, jüri-Q&A kanıtı olarak bir branch'te inşa edilecek mi, yoksa hackathon-sonrasına mı bırakılacak? (Video bağımlılığı olmadığı kesin.)

---

*İskeleti kahraman taşıyor, Şahin. Üretim, o omurgayı asla sallamayan ikinci bir nefes. Her kapıda geri dönebileceğin bir zemin var — ve o zemin tek başına bile eksiksiz bir teslim. 10 çocuktan 1'i bile şifa bulsun diye: önce sağlam olanı koru, sonra vizyonu ekle.*
