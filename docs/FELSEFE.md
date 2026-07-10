# FELSEFE — "Farkımız ne?" sorusunun baskın cevabı

> 10 Tem gece, Şahin'in tespitiyle kilitlendi: *"Fark bir cümle değilse, cümle
> kurtarmaz. Cevabımız felsefemizi yansıtan bir uygulama olmazsa orada patlarız."*
> Bu belge o cevabın kendisi: tez, retler, dürüst boşluk ve jüriye söylenecek
> kelimeler. Video omurgası ve README manifesto bölümü buradan derlenir.

---

## Tez (kilitli)

**Biz modelin zekâsına göre değil, yanılabilirliğine göre tasarlandık.**
**SALUS — hayır diyebilen klinik alet.**

Sektörün zımni felsefesi: *"Model akıllı, ona daha çok güven."* Bizimki tersi:
güven modele verilmez — **deterministik koda** ve **adı olan bir uzmanın
validasyonuna** verilir. Model karar verici değildir; uzman bilgisini gece
2'de yatağın başına taşıyan **dil katmanıdır**.

## Ürün retlerinden yapılmıştır (uygulamada YAŞAYAN kanıt)

| Ret | Nerede |
|---|---|
| "CT isteyemezsin" — imza mekaniği | Hero; UNAVAILABLE HERE damgası ekranda |
| Skoru model değil kod hesaplar | Hero score.ts — modelin not vermesine güvenmedik |
| Mimikler atlanamaz — yapı zorlar | Companion (iii) zorunlu hamle + mimik panosu |
| Düşük skor asla yeşil değil | ScoreMeter — güvenceye güvenmedik |
| Eşdeğerli asla rahatlatıcıya çözülmez | Asimetrik-güvenli varsayılan (prompt kuralı) |
| Doz asla, direktif asla | Üç katman: prompt + regex + UI bayrağı |
| Aile kapısı ayırıcı tanı vermez | Güvenli yönlendirme — ret + 112 |
| Kapsam dışı = ret | Scope-refusal, tek cümle |
| "I will not score" — 2 yaşındaki | Yaş rayı: kendi aletine bile ret |
| PHI cihazda bile durmaz | Unmount = silme; localStorage yok |
| "Never a free-text upload" | Kanıt kartı; kesikli raf TUŞ DEĞİL |

## Dürüst boşluk (sahnede BİZ söyleriz, jüri bulmaz)

**Companion'ın PAS/Alvarado aritmetiği hâlâ modelde.** Felsefe "güvenlik-kritik
iddia asla üretimden gelmez" der; skor tam öyle bir iddiadır. Canlıda iki kez
yakalandı (toplam hatası + bileşen atlaması), prompt-yama + red-team kontrolüyle
idare ediliyor, yol haritasının 1. maddesi: skor aritmetiği koda taşınacak
(PAS bileşenleri intake'ten deterministik). Kendi zaafını kendisi söyleyen
proje = felsefenin canlı icrası. *Yanılabilirliğe göre tasarlandık — bizimki dahil.*

---

## JÜRİYE SÖYLENECEK KELİMELER (demo SONRASI — İngilizce, ezber)

Demoyu görmüş jüriye uygulamayı ANLATMA — gördüklerini yeniden okutan MERCEĞİ ver:

> "Everything you just watched was built backwards from one question. Every AI
> product asks: *what can the model do?* We asked: **what must it never do — so
> that a doctor alone at 2 a.m. can act on what remains?**
>
> The demo you saw was a chain of refusals. The simulator **refused the CT** —
> that's its point. The companion raised **testicular torsion unprompted** —
> it refuses to trust the doctor's anchoring, or its own. It **refused to
> score a two-year-old** — outside its validated band. It has never once said
> a drug dose. And the low score never turns green — because in a village
> clinic at night, the dangerous answer isn't the wrong one, **it's the
> reassuring one.**
>
> That GROUNDED badge in the corner — click it. You'll find a surgeon's name,
> a book chapter, and the sentence *"never a free-text upload."* **Our AI's
> confidence has a signature under it.**
>
> That's the difference: SALUS is designed for the model's **fallibility**,
> not its intelligence. Including our own — the one place we're still below
> our own bar, score arithmetic, is caught, documented, and first on the
> roadmap."

### Q&A hançerleri (üç kaçınılmaz soru, üç cevap)

**"NotebookLM'den / ChatGPT'den farkınız ne?"**
> "NotebookLM answers the question you asked. Children die of the question
> the doctor *forgot* to ask. SALUS asks it for them — unprompted, every time,
> by structure, not by mood."

**"Neden sadece apandisit? Neden hastalık ekletmiyorsunuz?"**
> "Because a narrow tool can be validated, and only a validated tool deserves
> trust at a bedside. The engine takes domains as data — appendicitis is
> volume one, and it earned its light the hard way: authored by a surgeon,
> validated line by line, red-teamed for its own failure modes. Grounding
> anyone can paste in isn't grounding."

**"Halüsinasyonu çözdünüz mü?"**
> "No one has, and we won't pretend to. We built a system where hallucination
> is never load-bearing: physiology and scoring are deterministic code,
> knowledge is a named expert's document, and the model is the language
> between them."

---

## Jüri kelimelerinin TÜRKÇESİ (prova + Türkçe hikâye için)

> "Az önce izlediğiniz her şey, tek bir sorudan geriye doğru inşa edildi.
> Her yapay zekâ ürünü şunu sorar: model ne YAPABİLİR? Biz şunu sorduk:
> **neyi asla yapmamalı — ki gece 2'de tek başına kalan bir hekim, geriye
> kalana güvenerek davranabilsin?**
>
> İzlediğiniz demo bir retler zinciriydi. Simülatör **CT'yi reddetti** —
> zaten bütün amacı bu. Companion, **istenmeden testis torsiyonunu gündeme
> getirdi** — çünkü ne hekimin çapasına güvenir, ne kendisininkine. **İki
> yaşındaki çocuğu skorlamayı reddetti** — valide bandının dışında. Bir kez
> bile ilaç dozu söylemedi. Ve düşük skor asla yeşile dönmez — çünkü gece
> yarısı bir köy kliniğinde tehlikeli cevap yanlış olan değil, **rahatlatıcı
> olandır.**
>
> Köşedeki GROUNDED rozetine tıklayın. Bir cerrahın adını, bir kitap bölümünü
> ve şu cümleyi bulacaksınız: "asla serbest metin yüklemesi yok." **Bizim
> yapay zekâmızın özgüveninin altında bir imza var.**
>
> Fark bu: SALUS, modelin zekâsına göre değil, **yanılabilirliğine** göre
> tasarlandı. Bizimki de dahil — kendi barımızın altında kaldığımız tek yer
> olan skor aritmetiğini yakaladık, belgeledik ve yol haritamızın bir
> numarası yaptık."

**Hançerler (TR):**
- *NotebookLM:* "NotebookLM, sorduğunuz soruya cevap verir. Çocuklar, hekimin
  sormayı **unuttuğu** sorudan ölür. SALUS o soruyu onların yerine sorar —
  istenmeden, her seferinde, keyfe göre değil, yapı gereği."
- *Neden tek hastalık:* "Dar bir alet valide edilebilir; yatak başında güveni
  yalnız valide edilmiş alet hak eder. Motor, alanları veri olarak alır —
  apandisit birinci cilttir ve o ışığı zor yoldan kazandı. Herkesin
  yapıştırabildiği grounding, grounding değildir."
- *Halüsinasyon:* "Kimse çözmedi; biz de çözmüş gibi yapmayacağız.
  Halüsinasyonun taşıyıcı rol oynamadığı bir sistem kurduk: fizyoloji ve
  skorlama deterministik kod, bilgi adı belli bir uzmanın belgesi, model ise
  ikisinin arasındaki dil."

## Video omurgası (Gün-4 çekim planına girdi)

Retler sırayla = dramaturji: **CT reddi (hero)** → **istenmeden torsiyon
(companion)** → **"I will not score" (yaş rayı)** → **kesikli raf + "never a
free-text upload" (kanıt kartı)** → tek zaaf itirafı → tez cümlesi kapanış.
Her sahne bir ret; her ret bir güven gerekçesi.
