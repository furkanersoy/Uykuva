# Uykuva — Ürün ve Teknik Mimari

Son güncelleme: 26 Ekim 2026

Gece modu, Bugün ekranından açılır; ana başlık ve alt gezinmeyi gizleyip koyu temalı uyku sayacı ile uyku/beslenme/bez kısayolları gösterir. Uyku kaydı mevcut durum yönetimini kullanır, diğer kayıtlar mevcut kayıt formlarını açar. Üstteki çıkış düğmesi normal arayüze döner. Bu özellik yalnızca uygulama renklerini değiştirir; cihazın ekran parlaklığını veya işletim sistemi gece ayarını değiştirmez.

## 1. Ürün amacı

Uykuva, 0–18 aylık bebeği olan ebeveyn ve bakım verenlerin günlük bakımı tek yerde yönetmesini amaçlayan, çevrimdışı çalışabilen bir mobil uygulamadır.

Ürünün üç temel sorusu vardır:

1. Bebeğe en son ne zaman ve ne bakım verildi?
2. Bir sonraki uyku için olası zaman aralığı nedir?
3. Bakımı devralan kişinin şu anda bilmesi gerekenler nelerdir?

Uygulama şimdilik tamamen ücretsizdir. Kod tabanında ödeme duvarı veya abonelik kontrolü bulunmaz.

## 2. Ürün ilkeleri

- **Gece kullanılabilirlik:** Büyük dokunma alanları, düşük bilişsel yük ve tek elle kayıt.
- **Açıklanabilir öneri:** Uyku tahminleri tek bir kesin saat değil, zaman aralığı ve dayanak metni verir.
- **Bebeğin sinyalleri önceliklidir:** Plan katı bir program veya ağlatma sayacı değildir.
- **Çevrimdışı öncelikli:** Temel kayıt işlemleri internet bağlantısına ihtiyaç duymaz.
- **Veri sahipliği:** Ebeveyn kendi kayıtlarına ücretsiz erişir. Veriler ödeme duvarına konmaz.
- **Tıbbi sınır:** Uygulama tanı, tedavi veya ilaç dozu önermez.

## 3. Kullanılan teknoloji

| Katman | Teknoloji | Gerekçe |
| --- | --- | --- |
| Mobil | Expo SDK 58, React Native 0.88 | iOS ve Android için ortak kod tabanı |
| Dil | TypeScript | Veri modeli ve özelliklerde tip güvenliği |
| Yerel saklama | Expo SQLite (`uykuva.db`) | `app_state` ve indeksli `care_events` tabloları; eski SQLite KV/AsyncStorage verisinden güvenli geçiş |
| Test | TypeScript derleyicisi + Node test runner | Uyku motorunu arayüzden bağımsız test etme |
| Durum yönetimi | React hook'ları | Mevcut ölçek için düşük karmaşıklık |

Bulut senkronizasyonu eklendiğinde PostgreSQL tabanlı bir arka uç, satır seviyesinde erişim kuralları ve çevrimdışı olay senkronizasyonu kullanılacaktır. Sağlık verileri uygulama günlüklerine veya analitik olaylarına yazılmayacaktır.

## 4. Dizin yapısı

```text
SleepWell/
├── App.tsx                         # Uygulama kabuğu, sekmeler ve ekran bileşimi
├── app.json                        # Expo, iOS ve Android uygulama ayarları
├── package.json                    # Komutlar ve bağımlılıklar
├── src/
│   ├── app/
│   │   └── useUykuvaState.ts       # Uygulama durumu ve kullanıcı eylemleri
│   ├── data/
│   │   ├── migrations.ts           # Eski cihaz verileri için şema geçişleri
│   │   ├── seed.ts                 # Geliştirme başlangıç verisi
│   │   └── storage.ts              # Cihaz içi yükleme/kaydetme
│   ├── domain/
│   │   ├── types.ts                # Bebek, kayıt ve uyku planı veri modelleri
│   │   ├── vaccineSchedule.ts      # Ulusal aşı takvimi öneri tarihleri
│   │   ├── milk.ts                 # Sağım stoğu ve saklama süreleri
│   │   ├── sleep.ts                # Tahmin, koçluk ve devir özeti kuralları
│   │   └── sleep.test.ts           # Saf iş kuralları testleri
│   └── ui/
│       ├── components.tsx          # Ortak kart, buton ve etiket bileşenleri
│       └── theme.ts                # Renkler ve görsel token'lar
│   └── services/
│       └── notifications.ts        # İzin ve uyku hatırlatması planlama
└── ARCHITECTURE.md                 # Bu doküman
```

## 5. Uygulama katmanları

### Sunum katmanı

`App.tsx`, alt gezinmeyi ve beş ana alanı içerir:

- **Bugün:** Sıradaki uyku aralığı, hızlı kayıt, bakım devri ve son kayıtlar.
- **Akış:** Uyku, beslenme, bez ve notların ortak zaman çizelgesi.
- **Emzirme:** Tek oturumda sol/sağ taraf değişimi ve taraf başına ayrı süre; eski kayıtlar toplam süre olarak okunmaya devam eder.
- **Uyku:** 14 günlük uyku planı, yaklaşım seçimi, günlük görevler ve akşam rutini.
- **Özet:** Günlük toplamlar ve ileride eklenecek doktor raporu alanı.
- **Aile:** Bakım rolleri, devir özeti ve paylaşım.

Zaman çizelgesi, kayıt türüne göre filtreleri ve içerik/bakım veren adına göre yerel metin aramasını sunar; kayıt verileri depoda değişmeden kalır.

### Ulusal aşı takvimi önerileri

`src/domain/vaccineSchedule.ts`, Türkiye ulusal çocukluk dönemi takvimindeki yaş dönüm noktalarından tarih önerileri üretir. Yaşlar doğum tarihine takvim ayı eklenerek hesaplanır. `App.tsx` içindeki aşı öneri penceresi yalnızca gelecekteki önerileri gösterir; kullanıcı her birini ayrıca takvime ekler. Bu kayıtlar aşı yapıldığını göstermez. Geçmiş dozlar için telafi takvimi oluşturulmaz ve kullanıcı aile hekimine yönlendirilir.

Takvim verisi Sağlık Bakanlığının 2025 ulusal takvimine dayanır. 1 Eylül 2026 tarihli güncelleme suçiçeği aşısının ikinci dozunu 48. aya eklemiştir. Takvim ve öneri tarihleri sağlık profesyoneliyle doğrulanmalıdır.

Uyku koçu, seçilen yaklaşımı, hedef saatleri, etkin akşam rutini adımlarını ve o günün rehberini yerel paylaşım menüsüyle metin olarak diğer bakım verenlere gönderebilir. Paylaşım sunucuya yüklenmez.

Akşam rutini yürütücüsü, etkin adımları sırayla gösterir; adım tamamlamayı veya atlamayı takip eder. Rutin bitirildiğinde tamamlanan adım sayısı ve yaklaşık süre, etkin bakım veren adına zaman çizelgesine bir not olarak eklenir.

Sabah uyku check-in'i kolaylık puanı ve gece uyanma sayısına ek olarak isteğe bağlı kısa bağlam notu saklar. Bu check-in notları günlük doktor özetine dahil edilmez; cihaz verisi dışa aktarımında yer alır.

### Uygulama durumu

`useUykuvaState`, ekranların doğrudan depolama sistemiyle konuşmasını engeller. Şu eylemleri sağlar:

- Yeni bakım kaydı ekleme
- Uyku sayacını başlatma ve bitirme
- Kayıt silme
- Uyku eğitimi yaklaşımını değiştirme
- Günlük koçluk görevlerini tamamlama
- Planı sonraki güne ilerletme
- Her değişiklikten sonra cihaz içine kaydetme

### Alan mantığı

`src/domain` içindeki fonksiyonlar React Native'den bağımsızdır. Böylece tahmin ve planlama kuralları arayüz açılmadan test edilebilir.

Ana fonksiyonlar:

- `correctedAgeDays`: Gebelik haftası 37'nin altında olan bebeklerde ilk iki yıl düzeltilmiş yaşı hesaplar; uyku ekranı bu kullanımı açıklar. Aşı/randevu tarihleri gerçek doğum tarihine bağlıdır.
- `wakeBandFor`: Düzeltilmiş yaşa göre ürün referans aralığını seçer.
- `createSleepForecast`: Yaş aralığı ile tahmini saat dilimine ait son kullanılabilir uyanıklık sürelerini harmanlar.
- `estimateSleepWakeWindow`: Devam eden uykunun saat dilimindeki son 30 günlük benzer uyku sürelerinden, en az beş kayıt varsa ortanca ve çeyrekler arası uyanma aralığı üretir; bildirim veya kesin saat oluşturmaz.
- `createDailyNapOutline`: Son 14 günde en az üç farklı güne ait yeterli gündüz uykusu varsa sıra numarasına göre tarihsel saat aralığı çıkarır; bugünkü kaydı tarihsel aralığın yanında gösterir.
- `compareNapPatterns`: Önceki ve son yedi tam yerel günü ayrı inceler; bitmiş 15–240 dakika arası gündüz uykularının kayıt bulunduğu gün başına medyanını hesaplar. Her haftada en az dört kayıtlı gün yoksa karşılaştırma sunmaz. Sonucu yalnızca kaydedilen örüntü olarak açıklar, kestirme geçişi tahmin etmez.
- `createFeedingForecast`: Kayıtlı beslenme aralıklarının medyanından açıklanabilir bir sonraki aralığı üretir.
- `coachingDay`: Seçilen yaklaşıma göre 14 günlük planın günlük görevlerini üretir.
- `createSleepCoachInsights`: Son uzun gece uykularını hedef saatle karşılaştırır ve en fazla 15 dakikalık değişim üretir. Ayrıca rutin çalıştırıcısı bitişini izleyen 3 saatte başlayan en fazla yedi gece uykusuyla eşleşme kurup rutin–uyku başlangıç aralığının ortancasını verir.
- `handoffSummary`: Kullanıcının seçtiği 2/4/6/8 saatlik aralıktaki beslenme, pompa, bez, sağlık ve not kayıtlarını özetler; devam eden emzirmeyi işaretler, pencereyle kesişen uyku süresini hesaplar ve devam eden uykuyu belirtir. Ayrıca sonraki 24 saatin en yakın üç bakım görevini ekler. Tercih varsayılanı 4 saattir; eski yedeklerde alan yoksa migrasyon bu değeri kullanır.

### Veri katmanı

Durum `uykuva.db` dosyasında tutulur. Profil, tercih, görev ve uyku planı JSON olarak `app_state` satırında saklanır; bakım kayıtları ayrı `care_events` tablosundadır. `care_events` tablosu kayıt türü, başlangıç zamanı, bitiş zamanı ve bakım veren sütunlarını indeksleyerek taşır; geri kalan ayrıntılar olay JSON yükünde korunur. `saveState` olay tablosunu ve durum satırını aynı SQLite işlemi içinde günceller.

İlk açılışta depolama göçü eski `ExpoSQLiteStorage` anahtar deposundaki `uykuva:state:v3` / v2 veya önceki `uykvua:state:v1` AsyncStorage kaydını okur; durum ve olayları yeni veritabanına yazdıktan sonra eski anahtarları temizler. Göç tamamlanamazsa kayıt kurtarma ekranı yeniden deneme sunar; uygulama boş başlangıç durumunu eski verinin üzerine yazmaz.

JSON dışa aktarımı, `app_state` ile `care_events` satırlarını tam `AppState` olarak birleştirir. Böylece yedek şeması uygulama içi SQLite tablolarından bağımsız kalır.

Yedekleme akışı `createDataExport` ile cihaz verisini biçim etiketi ve şema sürümü taşıyan JSON'a dönüştürür. `parseDataExport` boyutu, biçimi ve temel profil/kayıt yapılarını doğrular; `migrateState` veriyi geçerli şemaya birleştirir. Kullanıcı mevcut verinin yerini alacağını onayladıktan sonra durum SQLite anahtarına kaydedilir. JSON yedeği `expo-file-system` ile yerel cache'e yazılır ve `expo-sharing` üzerinden dosya olarak paylaşılır. İçe aktarmada `expo-document-picker` dosyayı seçer; içerik mevcut JSON doğrulama ve kullanıcı onayı akışına girer. Metin yapıştırma seçeneği de korunur. Aile ekranındaki tek seferlik cihaz aktarımı aynı JSON dosyasını paylaşır; otomatik cihaz senkronizasyonu sağlamaz. Yedekler otomatik olarak sunucuya gönderilmez.

Sağım kayıtları beslenme tüketimlerinden ayrı tutulur. `src/domain/milk.ts` sağılan süt partilerini saklama türüne göre son kullanım tarihleriyle hesaplar; sağılan süt biberonları en eski uygun partiden düşer. Tamamen çözüldü olarak işaretlenen süt için 24 saatlik kullanım süresi başlatılır. Depolama aralıkları CDC rehberine dayalıdır ve uygulama stok uyarısını tıbbi talimat olarak sunmaz.

Uyku koçluğu günü yerel takvim gününde en fazla bir kez ilerler. `SleepPlan.lastAdvancedDate` bu günü saklar; gün 14'e ulaştığında son gün ayrıca tamamlanır ve `completedDate` kaydedilir. Arayüz 14 günlük ilerlemeyi gösterir, aynı gün tekrar ilerlemeyi engeller. Yedek doğrulaması yeni tarih alanlarını varsa doğrular, yoksa eski yedek uyumluluğunu korur.

Uyku planı duraklatma durumu `SleepPlan.paused` alanında saklanır. Duraklatılmış planda günlük koçluk adımları etkileşime kapanır ve gün ilerlemez; bakım kayıtları ile rutin çalıştırıcısı kullanılmaya devam eder. Migrasyon eski verilerde bu alanı `false` yapar; JSON yedek doğrulaması alan yoksa eski yedekleri kabul eder.

Akşam rutini adımları ebeveyn tarafından etkinleştirilip devre dışı bırakılabilir, süreleriyle birlikte saklanır ve uygulama içi yukarı/aşağı kontrolleriyle sıralanır. Rutin çalıştırıcısı bu sırayı kullanarak tamamlanma özetini zaman çizelgesine yazar.

Anı günlüğü, `memory` türünde zaman çizelgesi olayı olarak saklanır. Önerilen başlıklar yalnızca hızlı giriş içindir; gelişim zamanlaması veya değerlendirmesi sunulmaz.

Büyüme geçmişi, kaydedilen son sekiz kilo/boy/baş çevresi ölçümünü tarihle listeler; persentil hesabı veya normatif yorum yapmaz.

Gece uyanması rehberi yaş aşamasına göre ayrılır: yeni doğanda destek ve ihtiyaçlara yanıt, hazırlık döneminde tutarlı rutin, hazır oluş koşulları tamamlandığında ise seçili yaklaşımın adımları gösterilir. Beslenme ihtiyacını ertelemeyi veya ağlamayı görmezden gelmeyi önermeyen kısa yol gösterimi sunar. Bir yaş altı için güvenli uyku notu, [AAP HealthyChildren rehberindeki](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx) sırtüstü, sert/düz yüzey ve boş uyku alanı ilkelerine bağlanır. Bebeğin farklı bireysel ihtiyaçları için metin klinik değerlendirme yerine geçmez.

## 6. Uyku tahmin motoru

Tahmin motorunun mevcut davranışı:

1. Düzeltilmiş yaş 9 haftadan küçükse tahmin göstermez.
2. Bitmiş son uyku kaydını bulur.
3. Yaşa uygun genel uyanıklık aralığını seçer.
4. Son 14 takvim günündeki geçerli uyanıklık sürelerini altı yerel saat dilimine ayırır; her dilimde en fazla son 10 örneği tutar.
5. Gece diliminde en az iki, diğer dilimlerde en az beş örnek varsa ilgili dilimin medyanını yaş aralığıyla harmanlar; veri yetmezse yaş aralığını kullanır.
6. Tek saat yerine başlangıç ve bitiş aralığı üretir.
7. Veri miktarına göre düşük, orta veya yüksek güven etiketi verir.
8. Sonucun nedenini kullanıcıya düz metinle açıklar.

Bu motor bir tıbbi model değildir. Yayına çıkmadan önce referans aralıkları pediatri/uyku uzmanı tarafından gözden geçirilmeli ve içerik sürümüyle birlikte kaydedilmelidir.

## 7. Uyku eğitimi mimarisi

İlk çalışan sürüm üç baskısız yaklaşım sunar:

- **Duyarlı rutin:** Huzursuzluğa hızlı yanıt ve tutarlı uyku öncesi sıra.
- **Kademeli destek:** Bakım yardımını küçük adımlarla azaltma.
- **Yakında kalma:** Bakım verenin odada kalıp mesafeyi zamanla artırması.

Her yaklaşım için:

- 14 günlük aşamalı plan
- Günlük yapılacaklar listesi
- Tamamlanma durumu
- Özelleştirilebilir akşam rutini veri modeli
- Sabah değerlendirme sorusu
- Planı durdurmaya yönelten güvenlik metni

Uygulamada kontrollü ağlatma sayacı, kesin başarı vaadi veya bebeği görmezden gelmeye yönlendiren metin bulunmaz.

## 8. Mevcut veri modeli

### `Baby`

- Kimlik
- Ad
- Doğum tarihi
- Gebelik haftası

### `Caregiver`

- Kimlik, görünen ad ve ebeveyn/aile/bakıcı rolü
- Aktif bakım veren kimliği
- Yeni bakım kayıtlarında kullanılan bakım veren adı

### `CareEvent`

- Uyku, beslenme, bez veya bakım notu türü
- Başlangıç/bitiş zamanı
- Beslenme miktarı ve türü
- Bez türü
- Not
- Kaydı oluşturan bakım veren

### `SleepPlan`

- Seçilen yaklaşım
- Başlangıç tarihi ve plan günü
- Hedef yatış/kalkış zamanı
- Akşam rutini adımları
- Günlük tamamlanan görevler

## 9. Şu ana kadar yapılanlar

- [x] Expo/React Native TypeScript projesi oluşturuldu.
- [x] Uykuva marka adı ve paket kimlikleri tanımlandı.
- [x] Sakin, gece kullanımına uygun temel tasarım sistemi oluşturuldu.
- [x] Bugün ekranı ve açıklanabilir uyku kartı eklendi.
- [x] Uyku başlatma/bitirme işlemi eklendi.
- [x] Beslenme, bez ve bakım notu kayıtları eklendi.
- [x] Ortak zaman çizelgesi eklendi.
- [x] Son dört saat için bakım devri özeti eklendi.
- [x] Devir özetini sistem paylaşım menüsüyle gönderme eklendi.
- [x] 14 günlük uyku eğitimi/alışkanlık planı eklendi.
- [x] Üç nazik uyku yaklaşımı eklendi.
- [x] Günlük görev tamamlama ve plan ilerletme eklendi.
- [x] Akşam rutini veri modeli ve görünümü eklendi.
- [x] Günlük uyku, beslenme ve bez özeti eklendi.
- [x] Cihaz içinde otomatik veri saklama eklendi.
- [x] Gerçek ilk kurulum ve profil düzenleme akışı eklendi.
- [x] SQLite KV Store'dan `uykuva.db` yapısına geçiş ve eski veri migrasyonu eklendi.
- [x] İsteğe bağlı yerel uyku penceresi bildirimi eklendi.
- [x] Bildirim süresi seçimi (5–30 dakika) eklendi.
- [x] Uyku planı sabah kolaylık değerlendirmesi eklendi.
- [x] Yaşa göre ritim temelleri / nazik hazırlık / kişisel plan ayrımı eklendi.
- [x] Uyku planı hazır oluş ve güvenli uyku kontrol listesi eklendi.
- [x] Ateş, ilaç ve belirti kayıtları eklendi; doz önerisi verilmez.
- [x] Kilo, boy ve baş çevresi ölçüm kayıtları eklendi.
- [x] Yedi günlük paylaşılabilir doktor özeti eklendi.
- [x] Manuel aşı ve doktor randevusu görevleri eklendi.
- [x] Gece yarısını aşabilen sessiz saatler eklendi.
- [x] Tüm kullanıcı verisini JSON olarak dışa aktarma eklendi.
- [x] Onaylı cihaz verisi silme akışı eklendi.
- [x] Sağ/sol/iki taraf emzirme zamanlayıcısı eklendi.
- [x] Son kayda göre sıradaki emzirme tarafı önerisi eklendi.
- [x] Biberon miktarı ve katı gıda/tepki kaydı eklendi.
- [x] Açıklanabilir sıradaki beslenme aralığı eklendi.
- [x] Günlük emzirme süresi, biberon ve katı öğün toplamları eklendi.
- [x] Gerçek gece başlangıçlarını hedef yatışla karşılaştıran koçluk içgörüsü eklendi.
- [x] Gecelik değişimi 15 dakika ile sınırlayan yatış önerisi eklendi.
- [x] Düzenlenebilir hedef yatış ve sabah saatleri eklendi.
- [x] Açılıp kapatılabilen, ekleme ve silme destekli kişisel akşam rutini eklendi.
- [x] Aynı cihazda ebeveyn, aile üyesi ve bakıcı profilleri eklendi.
- [x] Aktif bakım veren değiştirme ve seçilen kişi adına kayıt ekleme eklendi.
- [x] Bakım veren rol seçimi, kaldırma ve eski veri migrasyonu eklendi.
- [x] Yedi günlük doktor özeti A4 PDF dosyası olarak oluşturulup paylaşılabiliyor.
- [x] Aşı ve doktor randevuları için sessiz saatleri gözeten yerel hatırlatmalar eklendi.
- [x] Uyku koçluğu yaş aşamasına göre ritim temellerine geçiyor; plan yaklaşımları hazırlık listesi tamamlanana kadar açılmıyor.
- [x] Sabah değerlendirmesinde gece uyanmaları kaydediliyor ve son yedi check-in ortalaması gösteriliyor.
- [x] Katı öğünlerde takip etiketleri ve ebeveyn gözlemi zaman çizelgesi, devir özeti ve doktor özetinde saklanıyor.
- [x] Son yedi günün uyku süreleri, gece yarısını aşan dönemler günlere dağıtılarak grafikte gösteriliyor.
- [x] Zaman çizelgesinden geçmiş uyku ekleme ve kayıt saatlerini düzenleme eklendi.
- [x] Zaman çizelgesinden tüm bakım kayıtlarının tarih ve saatini içeriği koruyarak düzeltme eklendi.
- [x] Uyku tahmini kişisel uyanıklık örneklerini son 14 günle sınırlar ve aktif uyku süresini canlı gösterir.
- [x] 9 haftadan küçük bebeklerde uyku, beslenme, bez ve sağlık özeti takvim günü yerine son 24 saati kapsar.
- [x] Tahmin aralığı geçtikten sonra kaydı olmayan bakım verene bir kez sorar ve gözden geçirilebilir tarihli kayıt açar.
- [x] Uyku tahmin motoru için birim testleri yazıldı.
- [x] Tüm özellikler ücretsiz bırakıldı; ödeme sistemi eklenmedi.

## 10. Henüz tamamlanmayanlar

- [x] Bakım olaylarını ayrı `care_events` SQLite tablosuna taşıma; eski SQLite KV ve AsyncStorage durum anahtarlarından güvenli ilk açılış göçü
- [ ] Bakım görevleri ve diğer büyüyen veri kümelerini normalize tablolara ayırma
- [ ] Güvenli hesap sistemi ve çoklu cihaz senkronizasyonu
- [ ] Telefonlar arası bakım veren daveti ve bulut erişim yönetimi
- [ ] Gelişmiş bildirim tercihleri ve görev hatırlatmaları (tekrarlayan görevler ve zamanlama seçenekleri)
- [ ] Widget, iOS Live Activity ve saat uygulamaları
- [ ] WHO büyüme grafikleri
- [ ] Türkiye aşı takvimi
- [ ] Ek gıda ve alerjen günlüğü
- [ ] Sesli Türkçe kayıt
- [ ] İkiz ve çoklu bebek desteği
- [ ] Erişilebilirlik testi, ekran okuyucu etiketleri ve dinamik yazı boyutu
- [ ] KVKK aydınlatma/açık rıza akışları, veri dışa aktarma ve silme ekranları
- [ ] Uzman içerik incelemesi ve klinik kaynak sürümleme
- [ ] Gerçek cihaz, mağaza ve uçtan uca testleri

## 11. Sonraki geliştirme sırası

1. Görev hatırlatmaları ve güvenilir zamanlayıcılar; görev verilerini normalize SQLite tablosuna taşıma
2. Aile hesabı, davet ve çevrimdışı senkronizasyon
3. Büyüme, aşı ve doktor raporu
4. Widget, Live Activity ve sesli kayıt
5. İçerik/uyku planlarının uzman doğrulaması
6. Kapalı beta, erişilebilirlik ve mağaza hazırlığı

## 12. Güvenlik ve mevzuat notları

- Bebek ve sağlıkla ilişkili kayıtlar hassas veri kabul edilerek tasarlanmalıdır.
- Aktarımda TLS, depoda şifreleme ve ayrıntılı erişim denetimi zorunludur.
- Üretim analitiğinde olay ayrıntıları, bebek adı, doğum tarihi veya bakım notu bulunmamalıdır.
- Bulut sağlayıcı ve yurt dışı aktarımı seçilmeden önce KVKK aktarım mekanizması belirlenmelidir.
- Uygulama içinden hesap/veri silme ve makinece okunabilir dışa aktarma sunulmalıdır.
- Tahmin metodolojisi ve sınırları uygulama içinde açıklanmalıdır.
- İlaç modülü yalnızca kullanıcının verdiği saat/miktarı kaydetmeli; doz veya tekrar zamanı önermemelidir.

## 13. Çalıştırma ve doğrulama

Bağımlılıklar kurulduktan sonra:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run doctor
npm.cmd start
```

Windows PowerShell yürütme politikası `npm.ps1` dosyasını engelleyebildiği için komutlarda `npm.cmd` kullanılır.

### Son doğrulama sonucu

26 Ekim 2026 tarihinde:

- `npm.cmd run typecheck`: başarılı
- `npm.cmd test`: 13/13 test başarılı
- `npx.cmd expo-doctor`: 20/20 kontrol başarılı
- `npx.cmd expo export --platform android`: Android üretim paketi başarıyla oluşturuldu

`npm audit`, Expo CLI'nin dolaylı olarak kullandığı `node-forge` ve `zod` paketlerinde beş yüksek önem dereceli bildirim göstermektedir. npm'nin önerdiği otomatik zorlanmış çözüm Expo'yu 44 sürümüne düşürdüğü için uygulanmamıştır; bu kırıcı ve güvensiz bir sürüm gerilemesi olur. Bağımlılıklar Expo SDK 58 güncellemeleriyle takip edilmelidir. Bu paketler mevcut uygulama özelliklerinde kullanıcı verisini işleyen özel bir sunucu katmanı değildir, ancak mağaza sürümünden önce bildirimler yeniden değerlendirilmelidir.
