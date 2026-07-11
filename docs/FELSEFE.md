# FELSEFE — "Farkımız ne?" sorusunun baskın cevabı

> 10 Tem gece, Şahin'in tespitiyle kilitlendi: *"Fark bir cümle değilse, cümle
> kurtarmaz. Cevabımız felsefemizi yansıtan bir uygulama olmazsa orada patlarız."*
> Bu belge o cevabın kendisi: tez, retler ve dürüst boşluk.

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

## Dürüst boşluk (yakalandı → kapatıldı)

**Companion'ın PAS/Alvarado aritmetiği başta modeldeydi.** Felsefe
"güvenlik-kritik iddia asla üretimden gelmez" der; skor tam öyle bir iddiadır.
Canlıda iki kez yakalandı (toplam hatası + bileşen atlaması) ve yol haritasının
1. maddesi olarak koda taşındı: PAS/Alvarado artık intake'ten deterministik
hesaplanıyor (`functions/lib/consultScore.ts`, sınır değerleri test bataryasıyla
sabitlenmiş), model sayıları yalnız VERİ olarak alıyor ve asla kendisi
hesaplamıyor. Kalan dürüst sınır: sayıların ETRAFINDAKİ dil hâlâ modelin —
"asla yeniden hesaplama" kuralı prompt'la ve canlı skor panosuyla denetleniyor.
Kendi zaafını önce kendisi söyleyen, sonra kapatan proje = felsefenin canlı
icrası. *Yanılabilirliğe göre tasarlandık — bizimki dahil.*
