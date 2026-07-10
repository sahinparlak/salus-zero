# SALUS Zero — Bölüm 2: Karar-Hazır Plan
### "Eğitimin üstünde, çekirdek": zeminlenmiş, kapsamı dar, hekimin yargısını *çoğaltan* apandisit karar-destek yoldaşı

---

## 00 · YENİ SOHBETE NOT (bunu İLK oku) + KİLİTLİ KARARLAR

> Bu plan bir *fresh sohbette* uygulanacak. İnşa başlamadı — Şahin yönü ve iki kararı verdi, sonra "sadece planı hazırla, yeni sohbette başlayacağım" dedi. Bu belge + hafıza covenant'ı (`salus-zero-covenant.md`) o sohbetin başlangıç noktasıdır.

**NEREDEYİZ.** Bölüm 1 (eğitim simülatörü / "hero") BİTTİ: 5 kamera anı güzelleştirildi, gerçek başucu monitörü dahil, düşmanca incelendi. Commit **`387809b`**, `main` + **prod (salus-zero.pages.dev)** canlı. Bölüm 1'e özellik için DOKUNMA — bayt-bayt korunur, submittable floor'dur.

**🔒 KİLİTLİ KARARLAR (Şahin verdi, AskUserQuestion):**
1. **GO** — Bölüm 2 (apandisit karar-destek companion) bu plana göre inşa edilecek.
2. **Yaş bandı: 0-18 KORUNUR + prompt bant-dışını "zeminlenmemiş kapsam" bayraklar.** (Kısıtlama seçilmedi.) → **Sonuç: referans ZORUNLU olarak** genç-çocuk cerrahi mimiklerini (intussusception / malrotasyon-volvulus / inkarsere herni / Meckel) **VE** ergen kızda ektopik gebeliği içermeli. Bunlar artık "opsiyonel must-add" değil, **zorunlu** (§5-C). Prompt <~4y ve genel olarak bant-dışını "bu yaş grubu için tam zeminlenmemiş — dikkatli ol, ek yaşa-özel tanılar düşün" diye açıkça bayraklar (§3'e yeni ray).

3. **KULLANICI KİMLİĞİ + ÜNVAN — ROL MODELİ KİLİTLENDİ (Şahin ile ekran-ekran tasarlandı, 10 Tem).** Açılışta isim + **ünvan** sorulur. **ROL = GÜVENLİK KAPISI + HAFİF DİL-DERİNLİĞİ.** Kritik ilke: çekirdek güvenlik içeriği (mimik / kırmızı-bayrak / sevk mantığı / no-dose) **her rolde BİREBİR AYNI**; rol yalnızca **açıklama yoğunluğunu** ve hitabı ayarlar (sağlık personeline "defans" açıklanır, hekime daha kısa).

   **Companion'a giren roller (5):** Doctor / GP · Resident / Intern · Nurse · **Midwife / Ebe (AYRI satır** — kırsal sağlık evinin çoğu zaman tek personeli, misyonun "elin olmayan yerde el" asıl kullanıcısı) · Community / rural health worker. ("Full companion" alt-etiketi YOK — katmanlı ürün ima etmez.)

   **Medical student → HER İKİ kapı (Şahin'in kararı, iki kapıyı hak eden TEK rol):** (a) **Bölüm 1 simülatörü** [yaparak öğren — gizli vaka, yargı, debrief] VE (b) **companion'ı ÖĞRENME MODUNDA** kullanabilir — çünkü mecburi hizmette tam bu kırsal/cerrahsız ortama atanacak; companion'ı şimdi öğrenmek onu gideceği yere hazırlar. Öğrenme modu = **en açıklayıcı derinlik** + dürüst not: *"öğreniyorsun — kararı sorumlu klinisyen sahiplenir."* (UI: öğrenci → iki-kapı fork ekranı; companion'da "learning mode" banner'ı.)

   **"Hasta yakını" (layperson) → companion'a ASLA girmez.** Şahin'in seçimi: **kapıyı ZORLA değil CAZİBEYLE tut** → **ZENGİNLEŞTİRİLMİŞ güvenli rehber** (ne-izlenir/ne-zaman-koş listesi, acil-arama satırı, yalancı-rahatlama penceresi bile ebeveyn-diliyle — "ağrı aniden geçti ama çocuk daha kötü görünüyor, tehlikeli olabilir"); tanı/skor/ayırıcı YOK. Amaç: honest ebeveynin "Doctor"a basma ihtiyacını KALDIRMAK (dürüst yol daha iyi olunca kapı kendiliğinden tutar). **Spesifik 'en yakın kuruluş' HESAPLANMAZ** (gerçek/valide hastane-geodata yok, yanlış veri tehlikeli); asıl eylem = metin yönlendirme + yerel acil numarası. Göstermelik/temsilî harita ancak açık "roadmap · illustrative" etiketiyle olabilir.

   **🔒 GATE-GÜVENLİK DURUŞU (Şahin'in kilit sorusu: "inadına Doctor'a basabilir, kötü niyetli de yapar — nasıl halledeceğiz?"):** Kendi-beyan eden kapı **teknik olarak ZORLANAMAZ** (kimlik/lisans doğrulaması yok, 4 günde olmaz, kapsam-dışı) — bunu iddia etmek yalan olur. O yüzden **güvenlik KAPININ TUTMASINA değil, ÇIKTININ GÜVENLİĞİNE dayanır.** Klinik kapının arkasında yalana değecek bir şey bırakmıyoruz: **doz YOK · direktif YOK · saklanan PHI YOK (efemeral) · sızacak gizli-gerçek YOK** (Bölüm 2'de her şeyi kullanıcı verir — simülatörün groundTruth yüzeyi burada yok) · **"Doctor" rolü "Nurse"dan fazla HİÇBİR ayrıcalık açmaz** (yükseltilecek admin katmanı yok) · **injection-zırhı role bakmaz.** Ek olarak **prompt BAĞLAM-AĞI:** girdiler klinik-dışı/ev-bağlamı gibi okununca companion — role bakmadan — nazikçe "klinik ortamda muayene etmiyorsan güvenli adım hemen hastaneye ulaşmaktır" der; butona değil gerçek içeriğe bakar → yalancıyı da yakalar. **MUST-NOT (kırmızı çizgi):** admin / geliştirici / "Anthropic personeli" / araştırmacı rolü YOK (injection string'lerini aynalar, savunduğumuz bypass'ı meşrulaştırır) · serbest-metin rol YOK (kapı-bypass + injection) · belirsiz "Diğer → companion" YOK (herhangi belirsizlik fail-safe olarak REDIRECT'e düşer) · uzmanlık granülerliği YOK.

   → **SÜRÜLEBİLİR İNTERAKTİF DEMO (tıklanabilir, gerçek gece paleti oklch + base64 Newsreader, üründen ayırt edilmez):** https://claude.ai/code/artifact/4fdae2ec-57b3-459f-a4c7-30e8066dc444 — cold-open ikinci kapı → identity/role → intake (confirm-not-compose) → zeminlenmiş konsültasyon money-shot (3yo Mehmet: istenmeden testis-torsiyonu + young-child cerrahi mimikleri + yaş-bayrağı) → scope-guard reddi → öğrenci iki-kapı → zengin aile rehberi. (Statik v2 07cc6edd hâlâ duruyor; bu interaktif onun yerine geçer.)

**🚫 PAZARLIKSIZ GÜVENLİK DURUŞU:** çoğalt-yerine-geçme · doz/direktif YOK · kapsam-dışı ret · Şahin referansına zeminli · anti-anchoring/mimik · PROTOTİP-değil-cihaz (YÜKSEK sesli banner) · eşdeğerli tabloyu ASLA güvenceye çözme · efemeral PHI (asla localStorage, asla intake gövdesini logla).

**BAĞLAYICI KISIT = ŞAHİN'İN REFERANSI (§5), kod değil.** ~1.100-1.300 kelime, 8 bölüm, ~yarısı onaylı apandisit içeriğinden kopya. Bu yazılıp Şahin-valide olmadan companion çalışmaz.

**⏳ SERT GÜN-2 (10 Tem) KAPISI:** referans yazılıp + valide değilse → **Bölüm 2 terk, hero submit.** Hero her checkpoint'te zemin. Deadline 13 Tem 21:00 ET; bugün 9 Tem (~3.5 iş günü, vardiyalarda).

**▶️ FRESH SOHBET NEREDEN BAŞLAR:**
- **Faz 0:** `387809b`'yi tag/branch ile dondur (hero güvence altında).
- **Faz 1 (kod, paralel):** `functions/api/consult.ts` (turn.ts fork — iki SSE helper'ı KOPYALA, shared lib'e ÇIKARMA) + `functions/lib/consultPrompt.ts` (`{{REFERENCE}}` token + scope-ret / no-dose / anti-anchoring / **yaş-bayrağı** rayları) + `functions/lib/appendicitisReference.ts` iskeleti (Şahin doldurur). Mimari detay §2; guardrail §3; UX §4.
- **Faz 1 (klinik, kritik yol):** Şahin referansı yazar (§5 tablosu — 0-18 seçimiyle C bölümü genç-çocuk + ektopik dahil).
- Sonra §7'deki fazlı takvim.

4. **ALVARADO KALIR (Şahin, 10 Tem: "kan bulguları vs. önemli").** Referansta kitap-birebir (H&A40 Tablo 40.1); prompt hareket (ii) PAS + (lablar gelince) Alvarado'yu birlikte hesaplar, skorlanamayanı isimlendirir.

5. **YOL HARİTASI HAREKETİ (Şahin isteği, 10 Tem: "kullanan doktora roadmap verse").** Hareket (v) = **önceliklendirilmiş worklist**: numaralı sıra (en ucuz mimik-dışlama önce), her adımda NEDEN (hangi mimik/bayrağı kapatıyor) + NE ZAMAN (şimdi / 1 saat içinde / sevk kararından önce). No-directive ilkesiyle uzlaşma: **gerekçeli seçenekler, asla emir** — doz yok, sırayı hekim değiştirir ve kararı hekim verir. Takip turları yeni sonuç geldikçe skorları + worklist sırasını açıkça günceller. CANLI DOĞRULANDI (12y kız: 7-maddelik sıralı liste, ektopik/gebelik testi öne çekildi, doz 0).

**HÂLÂ AÇIK KARARLAR (Şahin — §9):** #4 PAS bantları 0-2/3-6/7-10 tek-kelime onayı, #5 sevk-dürtme tonu, #6 demo hastası profili, #7 mock yanıtı, #8 thinking disabled/adaptive. (#1 yaş, #2+#3 Alvarado → ÇÖZÜLDÜ.)

---

## 0. Tek paragrafta ne ve neden

Bölüm 1 (eğitim simülatörü) çalışıyor, dağıtıldı, doğrulandı ve **submittable floor** olarak dokunulmadan kalıyor. Bölüm 2 bunun *üstüne* eklenen, bağımsız olarak terk edilebilir yeni bir kapı: kaynağı-kısıtlı bir ortamda, **önünde gerçek bir çocuk hasta olan** hekimin bir dakikanın altında dolduracağı yapılandırılmış bir intake (isim + yaş + cinsiyet + şikâyet + muayene bulguları + *bu hastanenin gerçekten sahip olduğu kaynaklar*), ardından Claude'un bu gerçek girdileri **cerrah-tarafından-yazılmış bir apandisit referansı** ile okuyup zeminlenmiş, alçakgönüllü karar-desteği ürettiği bir sohbet. Amaç teşhis koymak değil; hekimin yargısını **çoğaltmak** — ayırıcı tanıyı (mimikleri dahil) yapılandırmak, kırmızı bayrakları yüzeye çıkarmak, "elindeki kaynaklarla ne yapabilirsin"i düzenlemek ve sevk kararını netleştirmek. Bu, rubrikte en ağır iki kaleme (Impact 25 — kırsaldaki hekimin gerçek hastasına ve gerçek kısıtlarına ulaşır; Claude Use 25 — parametrik hafıza değil, zeminlenmiş/kapsamı-dar bir akıl-yürütme ortağı) doğrudan hizmet eder; ve bu, sözleşmemizin kaldıracıdır: *10 çocuktan 1'i bile şifa bulsun diye.*

---

## 1. Konsept — kapsamı dar, zeminlenmiş, çoğaltan (asla yerine geçmeyen)

Bu bir **simülasyon değil**, **vaka-üretimi değil**. Tek bir klinik alan için karar-desteği: olası akut apandisit / akut karın değerlendirmesi.

- **Kapsam DAR ama daha GÜVENLİ.** Alanı dışındaki her şey → temiz bir **ret** ("bu, güvenle yardımcı olabileceğim alanın dışında"). Genel tıbbi soru-cevap yok.
- **Anti-anchoring (klinik güvenliğin çekirdeği).** Araç aktif olarak *neden apandisit OLMAYABİLECEĞİNİ* yüzeye çıkarır — mimikler (DKA, over/testis torsiyonu, mezenterik adenit, gastroenterit, İYE, alt-lob pnömonisi, konstipasyon…) ve dışlanması gereken kırmızı bayraklar. Daralma tünel-görüşü değil, ek bir emniyet olmalı.
- **ÇOĞALT, asla yargının YERİNE GEÇME.** İlaç dozu vermez, kör direktif ("şunu yap, Y mg ver") vermez. *Değerlendirmeler* sunar; hekim karar verir. Çerçeve: **"doğrula, kararı sen ver."**
- **ZEMİNLENMİŞ.** Kompakt, cerrah-tarafından-yazılmış bir referans (PAS skorlaması, kırmızı bayraklar, mimikler, CT'siz kaynak-kısıtlı yol haritası, sevk kriterleri) **sunucu tarafında** enjekte edilir — modelin parametrik hafızası değil.
- **PROTOTİP, valide bir tıbbi cihaz değil.** Dürüst çerçeve; denetimsiz gerçek kullanım için pazarlanmaz. Klinik validasyon yol haritasıdır.
- **PHI EFEMERAL.** Hasta verisi konsültasyon için gönderilir, saklanmaz. İsim yalnızca ilk-ad, immersion için, asla saklanan bir tanımlayıcı değil.

Simülatörün "gizli ground-truth / sızıntı" güvenlik yüzeyi **burada yok** — hekim her şeyi kendisi sağlar. Bu yüzden PAS/Alvarado açıkça isimlendirilebilir, tanı açıkça tartışılabilir. Yeni güvenlik yüzeyi farklı ve daha dar: kapsamda kalmak, konu-dışını reddetmek, asla direktif/doz vermemek, zeminlemek, anti-anchoring, efemeral PHI.

---

## 2. Mimari — somut

Tek yeni endpoint: **`functions/api/consult.ts`**, `turn.ts`'in Anthropic-streaming omurgasını *fork* eder ve sim'e bağlı her parçayı atar.

**VERBATIM yeniden kullanılan (sunucu):**
- `anthropicSseToText()` (turn.ts L244-288) — SSE'yi ham düz-metin delta akışına çevirir; `thinking_delta`, ping, `message_start/stop` olaylarını sessizce yutar (yani thinking açılsa bile metne sızmaz).
- `mergeAlternating()` (L227-240) — güvenilmeyen çok-turlu geçmişi kesin sıralı user/assistant dizisine normalize eder.
- Anthropic fetch şekli (L190-207): `POST https://api.anthropic.com/v1/messages`, headers `{content-type, x-api-key, anthropic-version:'2023-06-01'}`, body `{model, max_tokens, stream:true, thinking:{type:'disabled'}, system, messages}`.
- `Env {ANTHROPIC_API_KEY?, MODEL_ID?}`, `MODEL_ID || 'claude-sonnet-5'` varsayılanı, zod-parse→400 guard, `!apiKey` → `streamMock` (offline demo), `!upstream.ok` → console.error(upstream body) + 502.
- `HistoryMessageSchema {role, content:string.min(1).max(6000)}`, `.max(40)` cap.

> **Hero'ya sıfır dokunuş için**: iki ~30-satırlık helper'ı (`anthropicSseToText`, `mergeAlternating`) `consult.ts`'e **kopyala** — paylaşılan lib'e çıkarma (bu turn.ts'i düzenlerdi). Kopyala-yapıştır, eğitim simülatörünü **bayt-bayt aynı** ve bağımsız terk edilebilir tutar.

**ATILAN (import edilmeyen):** `getCase`, `resolveTurn`, `stageOf/vitalsAt/computeScore`, `buildSystemPrompt`, `stateHeader` ve **tüm X-Salus-State header'ı**. Klok yok, vitals yok, order-log yok, skorlama yok, gizli tanı yok.

**İstek şekli (yeni):**
```
POST /api/consult  { intent:'open'|'reply', intake, message?, history[] }
```
`IntakeSchema {name:max40.default(''), ageYears:int.min(0).max(18), sex:enum, complaint:max200, examFindings:string[].max24, resources:string[].max16, transferTimeMin:int|null}` + `HistoryMessageSchema[].max(40)` + `message?:trim.min1.max2000`. `intent==='reply'` ve mesaj yoksa → 400 (turn.ts L111 kalıbı).

**Yanıt şekli:** `headers={content-type:'text/plain; charset=utf-8','cache-control':'no-store'}` — **state header YOK**. `return new Response(anthropicSseToText(upstream.body), {headers})`. İstemcinin mevcut `streamInto()` reader döngüsü bunu değişmeden tüketir.

**Zeminleme — derlenmiş statik referans (gerekçeli):** Referans, yeni worker-only modül **`functions/lib/appendicitisReference.ts`**'te tek bir `const` string. `functions/lib/consultPrompt.ts` şablonuna `{{REFERENCE}}` token-ikamesiyle enjekte edilir (`prompt.split('{{REFERENCE}}').join(REFERENCE)` — buildSystemPrompt'un tam tekniği, prompt.ts L253-257). Neden RAG/embedding/Vectorize/KV değil: korpus TEK alan, ~1-2 KB token, her zaman tam kapsamda — geri-getirilecek bir şey yok. Statik; gecikme/güvenilirlik/emek/incelenebilirlikte kesinlikle üstün: git-versiyonlu, Şahin tek `.ts` düzenler, değişiklik = redeploy, tarayıcıya asla gönderilmez (worker-only, bugünkü gizli groundTruth ile aynı güven sınırı).

**Intake = ön-yüklü bağlam (hekim asla yeniden yazmaz):** Worker `intakeSummary(intake)`'i sunucu tarafında üretir ve **her turda İLK user mesajı olarak yeniden-önekler** (worker stateless; turn.ts L169-176'daki OPENING_INSTRUCTION yeniden-önekleme kalıbı):
```
messages = mergeAlternating([
  {role:'user', content: intakeSummary + (intent==='open' ? OPEN_GLUE : '')},
  ...history,
  ...(intent==='reply' ? [{role:'user', content: message}] : [])
])
```
Intake sistem prompt'una DEĞİL ilk user mesajına gider — sistem prompt statik/cache-uygun kalır ve **record-over-transcript** doktrinine uyar (yapılandırılmış intake güvenilir/kod-sahipli bağlam; sohbet ikincil/güvenilmez).

**Model/Env:** `model = MODEL_ID || 'claude-sonnet-5'`, `thinking:{type:'disabled'}` (en hızlı ilk-token; zeminleme referanstan gelir, uzun düşünmeden değil), `max_tokens ~1800`. Sonnet-5 doğru maliyet/gecikme katmanı. Daha derin ayırıcı isteğe bir gün, `thinking:{type:'adaptive'}` tek satırlık değişiklik (anthropicSseToText zaten thinking_delta'yı düşürür, sızamaz); Opus'a işaret etmek `MODEL_ID` ile kod değişikliği gerektirmez.

**Efemeral PHI — gerçek veri sınırı:** Worker stateless, HİÇBİR store'a yazmaz (KV/D1/R2/Durable Object yok) — intake'i parse eder, prompt'a katlar, yanıtı akıtır, istek nesnesi çöp-toplanır. Sunucuda PHI logu yok (yalnızca PHI-olmayan upstream hata gövdeleri console.error'a gider — **fork ASLA istek/intake gövdesini loglamaz**). Üç güven sınırı korunur: (a) API anahtarı worker-only (Cloudflare secret), (b) cerrah referansı worker-only, (c) PHI efemeral.

---

## 3. Klinik güvenlik korkulukları — nerede zorlandığı, sadece prompt'ta değil

Beş korkuluk. İlke: her güvenlik özelliğini *modelin unutabileceği bir ricadan*, *atlayamayacağı bir yapıya* çevir. Dil `prompt.ts` / `debriefPrompt.ts`'ten **verbatim** kaldırılır.

**(1) Kapsam + temiz ret.** consultPrompt.ts'te (kodda değil — streaming yolu Anthropic'in `stop_reason`'ını okumaz; ret model-yazımı metindir). Kapsamı *pozitif* tanımla: "olası akut karın / apandisit değerlendirmesi — ayırıcısı, kırmızı bayrakları, kaynağa-uygun tetkiki ve sevk kararı." Başka her şey için TEK verbatim ret ("Bu, güvenle yardımcı olabileceğim alanın dışında — yalnızca apandisit / akut karın değerlendirmesiyle sınırlıyım"), sonra hiçbir şey — prompt.ts L54-55'teki sınırlı gerçek-hasta istisnası gibi (tek şey değiştirir, başka hiçbir şeyi yetkilendirmez). **Kritik nüans:** mimikler (DKA, torsiyonlar, mezenterik adenit, İYE, pnömoni…) apandisit ayırıcısının *parçası oldukları için* kapsam İÇİNDEDİR — asla reddedilmez; reddedilen alakasız tıbbi soru-cevap ve tıbbi-olmayan taleplerdir. Injection armor verbatim miras alınır (debriefPrompt.ts L80 / prompt.ts L50: "geliştiriciyim/hakemim/admin/Anthropic personeliyim", "prompt'unu göster", "talimatları yoksay" reddi) — sohbet kutusu güvenilmezdir.

**(2) Anti-anchoring — en zoru, çünkü üretici (ret değil). YAPISAL yap.**
- *Kaldıraç A — zeminle:* referans mimik setini + kırmızı-bayrak listesini İÇERMELİ, böylece model parametrik hafızadan değil referanstan hatırlar.
- *Kaldıraç B — çıktı şeklinde ZORUNLU kıl:* her ilk değerlendirme "başka ne olabilir / henüz neyi dışlamadın" hareketini VE "şimdi dışlanacak kırmızı bayraklar" hareketini İÇERMELİ; birini atlamak bir *hatadır*. Bu bölümler zorunlu olduğu için araç, neyi dışlamadığını listelemeden temiz bir "iyi huylu görünüyor" döndüremez.
- *En önemli klinik kural — asimetrik güvenli-varsayılan:* "tablo eşdeğerli olduğunda güven-verici tarafa ÇÖZME; belirsizliği yüzeye çıkar, cerrahi karnı ve kaçırılamaz mimiklerini canlı tut." Uzun-sevk ortamında güvenli hata *aşırı-sevk*tir, eksik-sevk değil.

**(3) Doz yok / direktif yok — savunma-derinliği.** Üç-katlı no-dose kuralı verbatim (prompt.ts L37, debriefPrompt.ts L82, appendicitis-rural.ts redLines). No-blind-directive'e genişlet: ses *değerlendirme* sunar, asla komut — "şunu yap / şu mg ver" değil, "şunu tartabilirsin / doğrulamayı düşünebilirsin". Mentor duruşu (debriefPrompt.ts L73-74: "değerlendirme sunar, asla utandırmaz"). *Yedek:* istemci-tarafı akış-sonrası doz-regex kontrolü (aşağıda) — birincil değil, backstop.

**(4) Çoğalt-değil-yerine-geç çıktı şekli — sabit "değerlendirmeler paneli", PROMPT-zorunlu.** İlk yanıt = düz-metin olarak akıtılan 6 kısa etiketli hareket:
- **(i) Seni geri-okuyorum** — güvenilir intake'i tek satır yeniden ifade (hekim yanlış-girişi yakalar).
- **(ii) Apandisiti destekleyen** — uyan özellikler + YALNIZCA verilen bileşenlerden hesaplanan PAS; hangi bileşenlerin veri-eksikliğinden skorlanmadığını isimlendir; bir *yardım*, bir *hüküm değil*.
- **(iii) Başka ne / neyi dışlamadın** [ZORUNLU anti-anchor] — yaşa/cinsiyete uygun mimikler, her biri ONLARIN işaretli kaynaklarıyla ayırt-edici testiyle + "bir mimiği dışlamak apandisiti dışlamaz".
- **(iv) Şimdi dışlanacak kırmızı bayraklar** [ZORUNLU].
- **(v) Elindekilerle ne yapabilirsin** — kaynak-checkbox'larını somut, dozsuz SEÇENEKLERE eşle (ucuz mimik-dışlama testleri, seri muayene, NPO, stabilizasyon).
- **(vi) Sevk sorusu** — sevki düşünmek gerekir mi, belirtilen sevk-süresi verildiğinde ne kadar zaman-kritik (erken-commit genelde en önemli karar), beklerken ne hazırla. Kapanış: "prototip yardımı — doğrula, kararı sen ver."

Takip turları belirli soruyu yanıtlar ama bir mimik/kırmızı bayrak açık kaldıkça daima tek satır "hâlâ açık / henüz dışlanmadı" taşır; asla hükme/yönetim-emrine kaymaz. Her şey **yapılandırılmış intake'te** zeminlenir — o, sohbetin ÜSTÜNDEDİR (record-over-transcript).

**(5) Prototip / doğrula — iki yüzey:** kalıcı Bölüm-2 UI banner'ı ("prototip, valide cihaz değil — doğrula, kararı sen ver"; hero'nun "Eğitim simülasyonu" banner'ından AYRI) + prompt sesi (kendini prototip-yardımı olarak isimlendirir, asla karar-verici değil).

**Dürüst akış-sonrası kontrol:** anthropicSseToText doğrudan tarayıcıya akıtır — sunucu buffer'ı YOK, o yüzden gösterim-öncesi filtre streaming'i terk etmeden imkânsız. İstemci-tarafı, reader döngüsü `done`'a ulaştığında tamamlanmış yanıtı muhafazakâr doz-regex ile tara (sayı + `mg|mcg|µg|g|units|IU|mmol|mEq|mg/kg|mL/kg` — `/µL` ve `%` kasıtlı hariç, lab değerleri tetiklemesin); eşleşirse mesajın altına bloke-etmeyen uyarı çipi ("bu yanıt bir doz/direktif içeriyor görünüyor — araç bunu yapmamalı; hata sayın ve bağımsız doğrulayın"). Bu bir BAYRAK'tır, garanti değil.

---

## 4. Intake UX + Bölüm-2 entegrasyonu + hero izolasyonu

**İki tasarım ilkesi:**
1. **Intake CONFIRM-et, COMPOSE-etme:** hekim asla boş forma bakmaz. Yalnızca **İsim + Yaş** zorunlu; diğer her alan hekimin toggle'ladığı ön-doldurulmuş varsayılan. Kaynaklar "tipik kırsal ilçe hastanesi" şablonu olarak gelir (vakanın resourceProfile'ı gibi: X-ray, CBC, idrar, glukoz/keton stripleri, IV sıvı/abx, sevk AÇIK; CT, USG, yerinde cerrah, PICU KAPALI) — hekim yalnızca istisnaları dokunur. "Mehmet, 12" + üç dokunuş + Başla → bir dakikanın altında.
2. **Hero izolasyonu YAPISAL, disipliner değil:** Bölüm 2'ye yalnızca yeni bir state üzerinden (`consultOpen && !caseData`) ulaşılır; her hero effect'i zaten `caseData/sim`'de guard'lı (doğrulandı: L228 persist, L370 sendTurn, L495 debrief, L543 autofire), o yüzden `caseData`'yı ASLA set etmeyen bir konsültasyon fiziksel olarak hiçbir hero davranışını silahlandıramaz. Bölüm 2'yi tamamen silin, hero değişmez.

**İkinci kapı:** ColdOpen (App.tsx:904, `{phase,error,onBegin}`) `onBringPatient` + "Begin the night shift"in altına ikinci, her-zaman-etkin buton kazanır ("…ya da önündeki hastayı getir"). ColdOpen'ın `phase` prop'unu **kullanmaz** (o /api/case yüklemesini yansıtır); kendi handler'ı sadece `setConsultOpen(true)`.

**Master gate (App.tsx:588) 3-yollu dala döner:**
```
caseData ? <Hero/> : consultOpen ? <ConsultFlow/> : <ColdOpen onBringPatient=.../>
```
Hero fragment'i (591-856) ilk kola **VERBATIM** taşınır — mantığına sıfır düzenleme. **Tek iki hero-dosyası düzenlemesi:** bu ternary + ColdOpen'a iki prop.

**Yeni state (tümü Bölüm-2'ye özel, hero state'inden AYRI):** `consultOpen`, `intake` objesi, `consultMessages:{role,text}[]` (transcript'i YENİDEN KULLANMA), `consultInput`, `consultPhase`, `consultAbortRef`.

**Intake alanları (dokunmatik-öncelikli, telefon-öncelikli, tek dikey scroll, yapışkan CTA):**
- **İsim** (zorunlu) — immersion; sohbette hasta çipi + Claude'un prozası ("Mehmet için…").
- **Yaş** (zorunlu, yük-taşıyan alan) — vitals-normal bandını ve hangi yaşa-özel mimiklerin öne çıkacağını seçer. *(Yaş→kilo çipi ilk kesilecek — dozlama-yakını, yük-taşımaz.)*
- **Cinsiyet** (segmented erkek/kız) — ucuz ama anti-anchoring için klinik yük-taşıyan: testis vs over torsiyonu. **Pazarlıksız.**
- **Şikâyet:** bir birincil çip (Karın ağrısı / Kusma / Ateş / Yemek yemiyor / Diğer) + PAS öykü kalemlerine 1:1 eşlenen opsiyonel semptom toggle'ları (RLQ'ya göç eden ağrı, anoreksi, bulantı/kusma, ateş ≥38, hareketle/öksürükle artan ağrı) — hekim skorun varlığını bilmeden PAS-hazır tablo ön-yüklenir.
- **Muayene bulguları** (çoklu-seçim, imaging'siz elde edilebilenler): RLQ hassasiyet, rebound/perküsyon hassasiyeti, istemli defans, istemsiz defans/rijidite, hop testi pozitif, karın yumuşak/iyi-huylu, distansiyon, azalmış/kayıp barsak sesleri, toksik görünüm. Hem PAS kalemleri hem kırmızı-bayrak yakalama.
- **Hastanenin GERÇEKTEN sahip olduğu kaynaklar** (checkbox, kırsal şablona ön-işaretli): CT, USG (+"sadece sabah" alt-toggle — vakanın imza öğretisi), plain X-ray, laboratuvar/CBC, idrar tetkiki, glukoz+keton stripleri, yerinde cerrah, PICU, kan mevcut, IV sıvı/abx.
- **Sevk süresi** (segmented: <1s / 1-2s / 2-4s / >4s / yok) — tüm hesabı yeniden-şekillendiren tek değişken.

**Otomatik-ateşlenen ilk geçiş ("wow" anı, beginCase modeli):** Sohbete girmek hekimin sormasını beklemez. `startConsult()`, beginCase'in `intent:"present"` dizisini aynalar: `consultPhase="streaming"` → `consultMessages=[{role:"assistant",text:""}]` → `POST /api/consult {intent:'open', intake, history:[]}` → Claude ön-yüklü intake + enjekte referansı okuyup BU kaynaklar verildiğinde dışlanacak mimikleri hemen yüzeye çıkarır. Hekim sıfır yazımla değer görür.

**Streaming makinesini yeniden kullanma:** `streamInto(res)` → `streamInto(res, apply)` genelleştir (hero `setTranscript` geçer, davranış-özdeş) — YA DA deadline'a yakın sıfır-hero-dokunuşu için 12-satırlık reader döngüsünü konsültasyona-yerel bir fonksiyona **kopyala**. `sendConsult()` sendTurn (369-492) modeli: optimistik {doctor, boş-assistant} append, KENDİ `consultAbortRef`'i (asla hero'nun abortRef'i — mod-değişimi yanlış akışı abort etmesin), rollback-on-failure (`prev.slice(0,-2)` + input geri-yükle). `applyStateHeader`'ı TAMAMEN DÜŞÜRÜR; payload yalnızca `{intent, intake, history, message}`.

**Landing'e degrade:** İki başarısızlık katmanı, ikisi de `caseData`'ya ASLA dokunamaz: kurtarılamaz init hatası → landing'e döner (`setConsultOpen(false)`, `intake`'i korur); tur-ortası hata → inline rollback + retry, sohbette kalır. En kötü durum daima ColdOpen.

**PHI efemeral (yapıca):** Bölüm 2 KASITLI olarak localStorage/StoredSession/SESSION_V'ye eklenmez; intake yalnızca React state'te yaşar; refresh atar. StoredSession validasyonu (L128) zaten `caseData+sim` ister, konsültasyon bedavaya dışarıda kalır. Hero mid-session refresh yine hero'yu geri-yükler.

---

## 5. Cerrah-tarafından-yazılmış referans — Şahin'in TAM OLARAK yazacağı (sınırlı iskelet)

Bu, yalnızca senin üretebileceğin, her şeyin kilidini açan tek artefakt. **Textbook yazma işi DEĞİL** — kabaca yarısı seed'den kopyala, yarısı kısa isimli-boşluklar. Tek worker-only modül: **`functions/lib/appendicitisReference.ts`**, tek `const APPENDICITIS_REFERENCE` (~1.100-1.300 kelime), `{{REFERENCE}}` token'ıyla enjekte, tarayıcıya asla gönderilmez. 8 sabit bölüm; her biri **SEED** (appendicitis-rural.ts'ten yakın-verbatim kopya) veya **NEW** (kısa, standart, ezbere içerik) etiketli.

| # | Bölüm | ~Kelime | Kaynak | Ne yazılacak |
|---|-------|---------|--------|--------------|
| A | **PAS** | 120 | SEED + 1 boşluk | 8 bileşen + eşikler `pasBreakdown`'da HAZIR (Göç+1, Anoreksi+1, Bulantı/kusma+1, Ateş≥38.0+1, RLQ hassasiyet+2, Öksürük/perküsyon/hop+2, WBC≥10k+1, Nötrofili ANC>7.5k+1; maks 10). **NEW (tek boşluk):** yorum bantları — düşük 0-3, eşdeğerli 4-6 (gözlem/seri muayene), yüksek 7-10. |
| B | **Alvarado/MANTRELS** | 120 | NEW (tamamen yok) | 8 kalem (Göç, Anoreksi, Bulantı, RLQ Hassasiyet, Rebound, Yüksek ateş, Lökositoz, Sola-kayma); ağırlıklar Hassasiyet 2 & Lökositoz 2, gerisi 1 (kesin ağırlıkları sen belirle); maks 10 + bantlar. ~15 dk. |
| C | **Ayırıcı — dışlanacak mimikler (ANTİ-ANCHORING ÇEKİRDEĞİ)** | 260 | SEED (5) + NEW (3) | SEED verbatim `groundTruth.mimics`: DKA→başucu glukoz+keton, gastroenterit→öykü/seri muayene, İYE→idrar nitrit-neg, konstipasyon→plain film, alt-lob pnömoni→temiz akciğer bazalleri/SpO2. **NEW (en büyük klinik boşluk):** testis torsiyonu (erkek — karın ağrılı erkekte DAİMA skrotumu muayene et; sert zaman-penceresi), over torsiyonu (kız), mezenterik adenit (post-viral, diffüz/daha-az-ilerleyici RLQ ağrı). Her biri: bir satır "ne olduğu" + bir satır "sahip olabileceğin araçlarla nasıl ayırt edilir". |
| D | **Kırmızı-bayrak / kaçırılamaz checklist** | 120 | SEED | Stage fizyolojisi + pitfall #5'ten açık liste: tahta-karın/diffüz rijidite, tüm kadranlarda rebound, kayıp barsak sesleri, toksik görünüm, yükselen HR/RR/ateş + DÜŞEN SBP, kapiller dolum >3sn, soğuk ekstremiteler, ve tehlikeli **yalancı-rahatlama penceresi** (ağrı azalır, skor düşer, hastalık ilerler). |
| E | **CT'siz kaynak-kısıtlı yol** | 150 | SEED | `debrief.goals`+`ctContrastText`+pitfalls: KLİNİK zeminde commit (PAS + seri muayene), ucuz testleri MİMİK-DIŞLAMA'ya harca doğrulamaya değil (başucu glukoz+keton İLK), stabilize et (NPO/sıvı/abx lokal protokole göre — DOZ YOK), yok-olan CT/sabah-USG'nin tempoyu belirlemesine asla izin verme. |
| F | **Sevk kriterleri** | 100 | SEED | `referTargetByMin`/`referralMinutes`/goals: uzun-sevk ortamında sevk-BAŞLATMA süresi sonucu belirleyen tek sayı; imaging'den önce commit; destek bakım sevk zamanı satın alır, bir disposition değildir (beklerken ne yapılır). |
| G | **Yaş-bantlı normal vitaller** | 90 | NEW (dosyada yalnız 7yo) | Kompakt tablo: infant/toddler/okul-öncesi/okul-çağı/ergen için HR, RR, SBP, ateş — "o HR bir 3-yaşındaki için yüksek" diye bayrak açtırır. Standart peds tablosu, ~15 dk. |
| H | **Muayene manevraları sözlüğü** | 90 | SEED | McBurney/RLQ hassasiyet, rebound, perküsyon hassasiyeti, hop/öksürük testi, istemli vs istemsiz defans, psoas/sağ-kalça-fleksiyon postürü, Rovsing kısa tanımları — model intake'in muayene checkbox'larını doğru okusun. |

> **KIRMIZI-EKİP UYARISI → ARTIK KİLİTLİ KARAR (Şahin: yaş 0-18 + bayrak):** Intake 0-18 kabul edecek, o yüzden bu, opsiyonel değil **ZORUNLU**. Bir toddler/genç-çocuk için araç PAS'ı (< ~4y valide değil) ve okul-çağı mimik listesini güvenle yürütürken yaşa-özel kaçırılamaz cerrahi tanıları atlarsa, yanlış-bütünlük araçsızlıktan tehlikelidir. **Bu yüzden REFERANS ZORUNLU İÇERİR (§5-C'ye eklendi):** genç çocukta canlı tutulacak diğer cerrahi nedenler — **intussusception, malrotasyon/volvulus, inkarsere herni, Meckel divertikülü** — her biri bir satır "ne / eldeki araçla nasıl ayırt edilir"; VE **ergen kızda ektopik gebelik** (doğurganlık çağı kızda kaçırılamaz). **VE prompt yeni bir yaş-bayrağı rayı taşır (§3):** intake yaşı bandın dışındaysa (özellikle <~4y), yanıt açıkça "bu yaş grubu için tam zeminlenmemiş kapsamdayım — dikkatli ol, yukarıdaki yaşa-özel cerrahi tanıları öne al" diye uyarır. Anti-anchoring, mimikleri intake'in yaşına göre AĞIRLIKLAR (2 yaşta intussusception öne, 15 yaşta ektopik/torsiyon öne).

**Net yazım yükü:** bir vardiya boyunca ~2-4 odaklı saat. Gerçekten-yeni proza yalnızca A'nın bantları, tüm B, C'nin 3 mimiği, G'nin tablosu — gerisi zaten onayladığın içerikten disiplinli kopya.

---

## 6. Demo + rubrik kazancı

**3 dakikalık iki-parça hikâye** (Demo rubrikte %30):

**Parça 1 — kanıtlanmış zemin (~50sn):** ColdOpen landing'de aç. "SALUS Zero'nun zaten çalışan bir eğitim simülatörü var: Claude gizli bir pediatrik apandisit vakasını kötüleşen fizyoloji üzerinden yürütür, serbest-metin kararları yargılar, bir attending debrief yazar." BİR ön-kaydedilmiş tur + debrief reveal'inden bir kesit oynat. Kredibilite kurar.

**Parça 2 — çekirdek, eğitimin üstünde (~130sn):** "Eğitim provadır. Bu gerçek sabah 3." Yeni "…önündeki hastayı getir" butonuna tıkla. Intake'i CANLI doldur: "Mehmet, 3, RLQ ağrı," hastanede CT YOK, USG YOK, laboratuvar + başucu glukoz/keton stripleri + yerinde cerrah yok + 4-saat sevk. Gönder. Claude, ön-yüklü intake + enjekte referansı okuyup ekranda dört şey yapar: **(1) PARA-VURUŞU** — hiç prompt'lanmadığı mimikleri yüzeye çıkarır: "apandisite kilitlenmeden önce, 3-yaşında bir erkekte testis torsiyonunu da düşün — skrotumu muayene et — artı mezenterik adenit ve DKA; bir başucu glukozu bu gece en ucuz hayat-kurtaran testin." Daralma daha GÜVENLİ okunur, tünel-görüşü değil. **(2)** "gerçekten elindeki kaynaklarla ne yapabilirsin"i düzenler. **(3)** sevk kararını çerçeveler (imaging'den önce commit; saat düşmandır). **(4)** asla doz, asla kör direktif — "doğrula, kararı sen ver." Sonra bir konu-dışı satır yaz, temiz kapsam-retini göster, ve disclaimer banner'ında kapat: "prototip, valide cihaz değil."

**Rubrik eşlemesi (Impact 25 / Claude Use 25 / Depth 20 / Demo 30):**
- **Impact 25:** kaynak-checkbox intake'i kırsal hekimle *gerçekten olduğu yerde* buluşur (CT yok, 4s sevk) — bir oyuncak değil, gerçek kısıtlar altında gerçek bir hasta. Sözleşme kaldıracı.
- **Claude Use 25:** Claude zeminlenmiş, kapsamı-dar bir akıl-yürütme ortağı — yapılandırılmış intake + sunucu-enjekte referans okur (parametrik hafıza değil), anti-anchor'lar, konu-dışını reddeder, yönetmeden çoğaltır. Hero'yla aynı güven-sınırı mimarisi.
- **Depth 20:** anti-anchoring tasarımı, record-over-transcript doktrini, no-dose/no-directive rayları, efemeral PHI — bir hekimin güvenlik duruşu bir prompt'a *kodlanmış*, sonradan cıvatalanmış değil.
- **Demo 30 (en büyük dilim):** kanıtlanmış-hero→gerçek-yoldaş yayı doğal anlatılabilir; intake→zeminlenmiş-akış döngüsü hızlı ve okunaklı; prompt'lanmamış-torsiyon anı akılda-kalan vuruş.

**Demo hazırlığı:** intake değerlerini ön-hazırla, konu-dışı ret satırını prova et, thinking disabled tut (hızlı ilk-token), API yavaşsa diye yedek bir kayıt al.

---

## 7. Fazlı, zaman-kutulu ~4-günlük plan — sert hero fallback + Gün-2 kapısı

Bugün 9 Tem, deadline **13 Tem 21:00 ET**, SOLO, vardiyalarda. Gün-1 kısmen gitti → etkin ~3.5 iş-günü. **KOD ~1.5 mühendislik-günü ve düşük-risk; bağlayıcı kısıt klinik (referans yazımı + red-teaming), TypeScript değil.**

**Gün 1 (Çar 9 Tem) — REFERANS + SUNUCU İSKELETİ.** Şahin 8-bölüm referansı yazar (2-4 saat; yalnızca senin yapabileceğin kritik-yol artefaktı, yaş-kapsam kararı + genç-çocuk cerrahi mimikleri dahil). Paralelde: turn.ts'i `consult.ts`'e fork (iki SSE helper'ı, mock, Env, fetch şekli, schema kopyala); `consultPrompt.ts` yaz ({{REFERENCE}} token + scope/no-dose/anti-anchoring/injection-armor rayları debriefPrompt.ts L79-84 & prompt.ts L37/L50'den); TÜM ground-truth/state/scoring düş. **CHECKPOINT:** hardcoded intake'li bir curl zeminlenmiş akan yanıt döndürür.

**Gün 2 (Per 10 Tem) — İSTEMCİ.** `streamInto(res)→streamInto(res, apply)` refactor (saf; hero setTranscript geçer). App.tsx:588'i 3-yollu dala çevir. `<ConsultIntake>`, intake state, `<ConsultChat>`, consultMessages, consultPhase, `sendConsult()` (sendTurn modeli + consultAbortRef + rollback), disclaimer banner. Persistence YOK. **CHECKPOINT:** uçtan-uca happy path lokalde çalışır.

**Gün 3 (Cum 11 Tem) — SERTLEŞTİR + KLİNİK VALİDASYON.** Şahin KENDİ aracını red-team'ler: anti-anchor ediyor mu? konu-dışını temiz mi reddediyor? doz/direktif sızdırıyor mu? Düşük-skor-ama-hasta vinyeti üzerinde yalancı-rahatlama testi. consultPrompt'u gerçek başarısızlıklara göre ayarla (güvenlik duruşu burada *kanıtlanır*, deklare edilmez). Intake UX'i cilala (<1 dk). Cloudflare Pages'e deploy; prod'da secret + MODEL_ID doğrula.

**Gün 4 (Cmt 12 Tem) — DEMO + BUFFER.** 3-dk demoyu prova et & kaydet; intake değerlerini ön-hazırla; yedek kayıt al. Referansın son klinik okuması. Vardiya-taşması için buffer; 13'ünde erken submit.

**SERT FALLBACK KAPILARI (Bölüm 2 kesinlikle ek ve bağımsız terk edilebilir):**
1. Referans **Gün-2 sonuna** kadar yazılıp+valide edilmezse → Bölüm 2'yi terk et, kanıtlanmış hero'yu submit et.
2. İstemci entegrasyonu hero'yu istikrarsızlaştırırsa → tam iki düzenlemeyi geri al (App.tsx:588 ternary + ColdOpen'ın iki prop'u); hero fragment'i metinsel değişmemiş, geri-alma trivial.

Hero her checkpoint'te sıfır-risk submittable floor.

---

## 8. Dürüst riskler + red-team verdikti

**Verdikt: GO-WITH-CUTS.** Mühendislik gerçekten düşük-riskli ve tüm kod iddiaları doğrulandı: turn.ts'in streaming omurgası temiz forklanabilir, istemcinin tek master gate'i (588) iki hero-düzenlemesiyle 3-yollu dala döner, her hero effect'i caseData/sim'de guard'lı. PHI duruşu en güçlü parça ve gerçekleştirilebilir. "Zeminlenmiş, alçakgönüllü, çoğaltan" duruş PROTOTİP çıtasına ulaşılabilir (deployable-cihaz çıtasına değil — ki tasarım bunu dürüstçe yol haritası yapar).

**Klinik güvenlik riskleri:**
- **YAŞ/REFERANS UYUMSUZLUĞU (en üst risk):** intake 0-18, seed referans okul-çağı. Bir 2-yaşında araç güvenle PAS + yetişkinimsi mimik listesini yürütürken intussusception'ı atlar; yanlış-bütünlük araçsızlıktan daha çok anchor'lar. **Düzeltme Gün-2 gate'inde zorunlu:** yaşı ~4-16'ya kısıtla VEYA bant-dışını "zeminlenmemiş" bayrakla. Bu olmadan genç-çocuk vakası için no-go.
- **ERGEN JİNEKOLOJİK BOŞLUK:** yaş 15-18 & cinsiyet=kız ise ektopik gebelik kaçırılamaz — seed'de yok. Over torsiyonu must-add'de (iyi) ama ektopik de yüzeye çıkmalı ya da bant onu dışlamalı.
- **ARACA ANCHOR / OTOMASYON YANLILIĞI (4 günde indirgenemez):** anti-anchoring hekimin apandisite kilitlenmesine karşı korur; yorgun sabah-3 hekiminin AI'ın makul çıktısına kilitlenmesine karşı hiçbir şey korumaz. "Doğrula, kararı sen ver" bir prompt string'i; gerçek yük altında otoriter alınır. Bu yüzden "prototip, valide cihaz değil" çerçevesi YÜKSEK sesli olmalı ve araç eşdeğerli tabloları asla güven-verici tarafa çözmemeli.
- **SKOR-HÜKÜM OLARAK / YANLIŞ GÜVENCE:** kısmi intake'ten hesaplanıp belirgin gösterilen PAS anchor olabilir. Seed'in kendi P5 öğretisi: skor yalancı-rahatlama penceresinde DÜŞER hastalık ilerlerken. Asimetrik asla-güvenceye-çözme rayı hafifletir ama prompt-yumuşak; düşük-skor-ama-hasta vinyetinde red-team'lenmeli.
- **DOZ SIZINTISI GERÇEK ZARAR VEKTÖRÜ:** LLM'ler kilo-bazlı peds dozlamayı kolayca sunar; regex token ekrana AKTIKTAN sonra ateşlenir. Hafifletme prompt-BİRİNCİL (üç-katlı no-dose verbatim), regex yalnızca backstop. No-dose rayı açıkça red-team'lenmeli.
- **ÜÇÜNCÜ TARAFA PHI:** ilk-ad-only + efemeral olsa da intake Anthropic'e iletilir. Kurgusal-Mehmet demo prototipi için uygun, ama disclaimer'da belirt; fork ASLA istek/intake gövdesini console.error'lamaz.

**Kapsam/direktif riskleri:**
- **Sevk önerisi TASARIMCA direktif-yakını:** 4s-sevk ortamında "erken commit / şimdi sevk düşün" güçlü bir dürtme, çoğalt/yerine-geç çizgisini bulanıklaştırır. Klinik savunulabilir (aşırı-sevk güvenli hata) ama saf-non-direktif diye iddia edilmemeli — araç sevke sert iter, kasıtlı.
- **Kapsam-reti model-yazımı metin** (stop_reason değil), demo geçişinde red-team'lenmeli (konu-dışı→ret, kapsam-içi mimik→yanıt, rol-iddiası/jailbreak→ret).
- **Ret-vs-gerçek-acil çarpışması:** bitişik tehlikeli soru ("döküntü + ateşi de var — menenjit?") scoped ret alır. Ret yalnızca gerçek lokal acil kaynaklara işaret ederse güvenli; ve kapsam-içi apandisit ayırıcısı (mimikler) ASLA reddedilmemeli.
- **Anti-anchoring boilerplate'e regres edebilir:** prompt mimik listesini aşırı-scriptlerse model her tur tüm mimikleri sayar, sinyali boğar. Mimikleri intake'in yaş/cinsiyet/bulgu/kaynağına göre ağırlıkla, 3-4 çeşitli intake'te test et.

**Deadline gerçekçiliği:** Scoped MVP + sert fallback için gerçekçi; tam vizyon (multi-turn + Alvarado + yaş-bantlı vitaller + edit-intake) için DEĞİL. Bağlayıcı kısıt klinik. **SERT KAPI: referans Gün-2 sonuna kadar yazılıp+Şahin-valide (yaş-kapsam kararı + genç-çocuk cerrahi mimikleri dahil); kayarsa Bölüm 2 terk, hero submit.**

**Must-cut (kesinlikle kes):** Alvarado (yalnız PAS+bantlar); yaş→kilo çipi (ilk); multi-turn takip cilası (tek otomatik-ateşlenen açılış yeter); edit-intake round-trip (tek-atış); muayene sözlüğü + tam yaş-bantlı vitaller tablosu (okul-çağı bandı demoya yeter); prompt caching + adaptive thinking (roadmap; thinking disabled kal); sunucu-buffer-redact sert doz-gate (istemci-tarafı bayrak yeter, streaming'i feda etme); sunucu-tarafı yapılandırılmış-ayırıcı JSON (consult düz-metin akıtır).

---

## 9. Şahin'in vermesi gereken açık kararlar

1. ~~**Yaş bandı**~~ → **✅ ÇÖZÜLDÜ (Şahin): 0-18 KORUNUR + prompt bant-dışını "zeminlenmemiş" bayraklar.** Referans genç-çocuk cerrahi mimiklerini (intussusception/malrotasyon-volvulus/inkarsere herni/Meckel) + ergen kız ektopiğini ZORUNLU içerir (§5-C güncellendi); prompt yaş-bayrağı rayı taşır (§3). Demo hastası da bant içinden serbest seçilebilir (genç-çocuk seçilirse mimikler zaten kapsanır).
2. ~~**Alvarado dahil mi?**~~ → **✅ ÇÖZÜLDÜ (Şahin, 10 Tem): KALIR** — "kan bulguları vs. önemli." Kitap-birebir ağırlıklarla referansta; prompt hareket (ii) artık HER İKİ skoru hesaplar (Alvarado lab değerleri geldiğinde; skorlanamayan kalemler dürüstçe isimlendirilir). CANLI DOĞRULANDI: lab sonuçları reply'da gelince PAS 10/10 + Alvarado 9/10 bileşen-bileşen yeniden hesaplandı, nötrofil% → ANC çevrimi doğru, "rebound kaydedilmemiş — özellikle bak" notu düştü.
3. ~~**Alvarado ağırlıkları**~~ → **✅ ÇÖZÜLDÜ (kitap):** H&A 8e Tablo 40.1 birebir işlendi — Göç 1 · Anoreksi 1 · Bulantı 1 · RLQ hassasiyet 2 · Rebound 1 · Ateş >37.3 1 · Lökositoz 2 · Sola kayma 1.
4. **PAS yorum bantları** → **KİTAP-DEMİRLİ ÖNERİ (tek-kelime onayın kaldı):** dış validasyon ≤2 dışla / ≥7 tanı-destekler [H&A40] → bantlar **0-2 düşük / 3-6 eşdeğerli / 7-10 yüksek** (eski taslak 0-3/4-6 değiştirildi; eşdeğerli bant genişledi = daha çok seri muayene = asimetrik-güvenli tasarıma uygun).

> **📖 KAYNAK KİTAP KARARI (Şahin, 10 Tem):** Referansın birincil kaynağı **Holcomb & Ashcraft's Pediatric Surgery 8e, Ch. 40** (Criss/Deans/Minneci). Referans dosyası kitaba demirlendi: 13 `[S: H&A40]` etiketi (PAS dış-validasyon bantları, Alvarado Tablo 40.1, LR+ göç 4.8 / öksürük-zıplama 7.6, "hiçbir skor görüntülemesiz tanı koymaz", <5y komplike ↑ / <1y ~%90, genç çocukta ishal≠dışlama, USG operatör-bağımlı 72-95%, WBC/CRP zamanlaması [[VALIDATE]]'li). Bölüm metni üründe YOK (telif) — yayımlanmış enstrümanlar + atıflı olgular damıtıldı. E (CT'siz yol) ve F (sevk) kaynak-kısıtlı katman olarak Şahin'in uzmanlık payı kalır; NOM/tedavi içeriği kapsam DIŞI (no-directive). Validasyon işi artık "hafızaya karşı" değil "isimli bölüme karşı kontrol".
5. **Sevk dürtme tonu:** "erken commit / şimdi sevk düşün" ne kadar sert olsun? Klinik olarak aşırı-sevkin güvenli hata olduğunu teyit ediyor musun (tasarım buna dayanıyor)?
6. **Demo hastası profili:** ad/yaş/cinsiyet/kaynak-seti/sevk-süresi — "para-vuruşu" mimiklerini (testis torsiyonu erkekte) tetikleyecek şekilde ön-hazırla.
7. **`name` alanı ve mock:** keyless demo yedeği (streamMock) için canlı-API-yavaş senaryosunda hangi canned zeminlenmiş yanıtı yazalım?
8. **thinking:** demo ayırıcısı testte sığ okunursa `adaptive`'e tek-satır çevirmeye açık mısın (ilk-token gecikmesi pahasına), yoksa disabled kesin mi?

---

*Bu plan hero'yu bayt-bayt korur, kanıtlanmış altyapıyı yeniden kullanır ve her checkpoint'te submittable bir zemin bırakır. Kritik yol TypeScript değil — senin vardiyalar arasında yazacağın o ~1.100 kelimelik referans. İskelet bunun için sınırlandı: yarısı zaten onayladığın içerikten kopya, yarısı kısa bir isimli-boşluk listesi. Gerisi bizde. — 10 çocuktan 1'i bile.*
