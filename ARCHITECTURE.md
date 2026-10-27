# Uykuva — Ürün ve Teknik Mimari

Son güncelleme: 27 Ekim 2026

Gece modu, Bugün ekranından açılır; ana başlık ve alt gezinmeyi gizleyip koyu temalı uyku sayacı ile uyku/beslenme/bez kısayolları gösterir. Uyku kaydı mevcut durum yönetimini kullanır, diğer kayıtlar mevcut kayıt formlarını açar. Üstteki çıkış düğmesi normal arayüze döner. Bu özellik yalnızca uygulama renklerini değiştirir; cihazın ekran parlaklığını veya işletim sistemi gece ayarını değiştirmez. Bugün ekranındaki saat sıralı 24 saatlik plan; kullanılabilir uyku ve beslenme tahminlerini, geçmiş kayıtlardan çıkarılan sonraki gündüz uykusu taslaklarını, hedef yatışı ve yaklaşan aşı/randevuları birleştirir. Hedef yatış geçmişte kaldıysa yarın için gösterilir; görevler plandan tamamlanabilir veya silinebilir.

Randevu gorevleri istege bagli note alaninda hazirlik notlarini saklar. Notlar gorev kartinda gorunur ve paylasilan doktor ozetine en yakin bes gelecek randevuyla birlikte eklenir; tamamlanmis veya gecmis randevular ozete alinmaz.

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
| Yerel saklama | Expo SQLite (`uykuva.db`) | `app_state`, indeksli `care_events` ve `care_tasks` tabloları; eski SQLite KV/AsyncStorage verisinden güvenli geçiş |
| Test | TypeScript derleyicisi + Node test runner | Uyku motorunu arayüzden bağımsız test etme |
| Durum yönetimi | React hook'ları | Mevcut ölçek için düşük karmaşıklık |

Bulut senkronizasyonu eklendiğinde PostgreSQL tabanlı bir arka uç, satır seviyesinde erişim kuralları ve çevrimdışı olay senkronizasyonu kullanılacaktır. Sağlık verileri uygulama günlüklerine veya analitik olaylarına yazılmayacaktır.

Android ana ekran uyku widget'ı `plugins/withUykuvaWidget.js` Expo config plugin'iyle oluşturulur. Plugin Android manifest'ine sağlayıcıyı ekler; Kotlin sağlayıcı/modülünü ve widget kaynaklarını yazar, React Native paketini `MainApplication` içine kaydeder. `App.tsx`, uygulama açıkken güncel bebek adı, uyku penceresi ve durum metnini yerel widget depolamasına gönderir. Android widget'ı en az 30 dakikalık işletim sistemi yenilemesini kullanır ve dokunulduğunda uygulamayı açar. Bu Android'e özgüdür; otomatik bulut senkronizasyonu veya iOS widget'ı sağlamaz. Böylece `expo prebuild` çalıştırıldığında yerel değişikliklerin kaybolmaması hedeflenir.

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
│   │   ├── diapers.ts              # Son yedi günün ıslak/kirli/ikili bez toplamları
│   │   ├── solids.ts               # Ek gıda ve alerjen etiket geçmişi
│   │   ├── milk.ts                 # Sağım stoğu ve saklama süreleri
│   │   ├── sleep.ts                # Tahmin, koçluk ve devir özeti kuralları
│   │   ├── milestones.ts           # Kayıt etkinliklerinden isteğe bağlı anı bulma
│   │   └── sleep.test.ts           # Saf iş kuralları testleri
│   └── ui/
│       ├── components.tsx          # Ortak kart, buton ve etiket bileşenleri
│       └── theme.ts                # Renkler ve görsel token'lar
│   └── services/
│       └── notifications.ts        # Uyku, bez kontrolü ve görev hatırlatmaları
└── ARCHITECTURE.md                 # Bu doküman
```

## 5. Uygulama katmanları

### Sunum katmanı

`App.tsx`, alt gezinmeyi ve altı ana alanı içerir:

- **Bugün:** Sıradaki uyku aralığı, hızlı kayıt, bakım devri ve son kayıtlar.
- **Akış:** Uyku, beslenme, bez ve notların ortak zaman çizelgesi.
- **Emzirme:** Tek oturumda sol/sağ taraf değişimi ve taraf başına ayrı süre; eski kayıtlar toplam süre olarak okunmaya devam eder.
- **Uyku:** 14 günlük uyku planı, yaklaşım seçimi, günlük görevler ve akşam rutini.
- **Özet:** Günlük toplamlar ve paylaşılabilir doktor raporu.
- **Aile:** Bakım rolleri, devir özeti ve paylaşım.

Zaman çizelgesi, kayıt türüne göre filtreleri ve içerik/bakım veren adına göre yerel metin aramasını sunar; kayıt verileri depoda değişmeden kalır. Bir kaydı silmek için uzun basma ve ayrıca kullanıcı onayı gerekir.

### Ulusal aşı takvimi önerileri

`src/domain/vaccineSchedule.ts`, Türkiye ulusal çocukluk dönemi takvimindeki yaş dönüm noktalarından tarih önerileri üretir. Yaşlar doğum tarihine takvim ayı eklenerek hesaplanır; doğum günündeki öneri gün sonuna kadar görünür kalır. `TURKEY_VACCINE_SCHEDULE_BASE_VERSION`, `TURKEY_VACCINE_SCHEDULE_UPDATE_DATE` ve `TURKEY_VACCINE_SCHEDULE_UPDATE_SOURCE` önerinin temel sürümünü ve 1 Eylül 2026 güncelleme kaynağını gösterir. Öneri penceresi resmi duyuruya bağlantı verir; 49–72 ayda ikinci suçiçeği dozu kaydı yoksa aile hekimiyle kayıtları teyit etme uyarısı gösterir. Uygulama geçmiş dozları veya eksik doz gerekliliğini kendisi belirlemez; öneriler kullanıcı ayrıca takvime eklemeden kayıt oluşturmaz.

Takvim verisi Sağlık Bakanlığının [2025 ulusal çocukluk dönemi aşı kartına](https://hsgm.saglik.gov.tr/depo/birimler/asi-ile-onlenebilir-hastaliklar-db/dokumanlar/2025/asi_haftasi/50X30_asi_karti.pdf) dayanır; Hepatit B doğum dozunu içerir. Bakanlığın [1 Eylül 2026 güncellemesi](https://iskilipdh.saglik.gov.tr/TR-1590795/cocukluk-donemi-asilama-takvimi-guncellendi-sucicegi-asisinda-ikinci-doz-uygulamasi-basladi.html) ikinci suçiçeği dozunu 48. aya eklemiştir. Takvim ve öneri tarihleri aile hekimiyle doğrulanmalıdır.

Uyku koçu, seçilen yaklaşımı, hedef saatleri, etkin akşam rutini adımlarını ve o günün rehberini yerel paylaşım menüsüyle metin olarak diğer bakım verenlere gönderebilir. Paylaşım sunucuya yüklenmez.

Akşam rutini yürütücüsü, etkin adımları sırayla gösterir; adım tamamlamayı veya atlamayı takip eder. Rutin bitirildiğinde tamamlanan adım sayısı ve yaklaşık süre, etkin bakım veren adına zaman çizelgesine bir not olarak eklenir.

Sabah uyku check-in'i kolaylık puanı ve gece uyanma sayısına ek olarak isteğe bağlı yatış/uyanış saatleri ve kısa bağlam notu saklar. Bu check-in notları günlük doktor özetine dahil edilmez; cihaz verisi dışa aktarımında yer alır.

Bugün ekranındaki `Uyanma` kısayolu, her gece uyanmasında tarih/saat ve verilen desteği (`beslenme`, `sakinleştirme/yakınlık`, `bez/temel ihtiyaç`, `diğer`) bir check-in altında kaydeder; zaman son 24 saat içinde düzeltilebilir. Saatli kayıtlar elle bildirilen toplam uyanma sayısından ayrı tutulur, son 30 kayıtla sınırlanır; yanlış kayıtlar silinebilir. Bakım devri ve yedi günlük doktor özetinde bakım veren adıyla gösterilir. Bu, aile gözlem kaydıdır; uyku veya sağlık sonucu değerlendirmesi üretmez.

Bugün ekranındaki sabah uyanış alanı, dört rakamlı girişi otomatik olarak `SS:DD` biçimine getirir ve saat tamamlanınca ilk uyku penceresini hemen gösterir; kaydetme isteğe bağlıdır. Etkin akşam rutininin toplam süresi sıfırdan büyükse, aynı kart rutine yaklaşık başlangıç aralığını da pencerenin başlangıç ve bitişinden bu süre çıkarılarak gösterir. Bu, ailenin kendi rutin süresine dayalı planlama yardımcısıdır; uyku işaretlerinin yerine geçmez. Uyku koçluğundaki sabah check-in alanı da aynı uyku önizlemesini sunar. Check-in kaydedilince sabah saati Bugün ekranındaki ilk pencere için başlangıç noktası olur; bu uyanıştan sonraki ilk uyku kaydedilince tahmin son uykunun bitişinden devam eder. Dokuz haftadan küçük düzeltilmiş yaşta girilmiş uyanış saati varsa düşük güvenli yaş aralığı gösterilir; saat girilmediyse yalnızca açıklama sunulur.

Günün isteğe bağlı bağlamı (`illness`, `travel`, `teething`, `routineChange`) check-in'de saklanır ve yedeklerde doğrulanır. Bağlam işaretliyken uyku penceresi, uyku hatırlatmaları, koçluk görevleri ve günlük plan ilerletme duraklatılır; bakım kayıtları çalışmayı sürdürür. “Olağan gün” seçilince tahmin ve koçluk kaldığı yerden devam eder. Bu işaret yalnızca tahmin ve koçluk ilerlemesini sınırlar; sağlık değerlendirmesi üretmez.

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
- `createSleepForecast`: Son 14 gün içindeki en son tamamlanmış uykuyu kullanır; gelecekteki veya 14 günü aşan eski kayıtla pencere üretmez. Kişisel uyanıklık örneklerini son 30 günden toplar, yaş aralığıyla harmanlar ve kişisel/yaş bandı dışındaki uç değerleri yaş aralığında sınırlar. Tahmin aralığından sonra ebeveynin onaylayarak açtığı uyku kaydı, önerilen başlangıç/bitişi de saklar; en az üç eşleşme olduğunda son 30 gündeki gerçek başlangıç sapması pencerenin merkezini, hata dağılımı genişliğini ayarlar.
- `estimateSleepWakeWindow`: Devam eden uykunun saat dilimindeki son 30 günlük benzer uyku sürelerinden, en az beş kayıt varsa ortanca ve çeyrekler arası uyanma aralığı üretir; bildirim veya kesin saat oluşturmaz.
- `createDailyNapOutline`: Son 14 günde en az üç farklı güne ait yeterli gündüz uykusu varsa sıra numarasına göre tarihsel saat aralığı çıkarır; bugünkü kaydı tarihsel aralığın yanında gösterir. Bugünkü planda henüz kaydedilmemiş, gelecekteki uyku taslakları sonraki uyku tahminiyle çakışmıyorsa listelenir.
- `compareNapPatterns`: Önceki ve son yedi tam yerel günü ayrı inceler; bitmiş 15–240 dakika arası gündüz uykularının kayıt bulunduğu gün başına medyanını hesaplar. Her haftada en az dört kayıtlı gün yoksa karşılaştırma sunmaz. Sonucu yalnızca kaydedilen örüntü olarak açıklar, kestirme geçişi tahmin etmez.
- `createFeedingForecast`: Kayıtlı beslenme aralıklarının medyanından açıklanabilir bir sonraki aralığı üretir; hesaplanan aralık tamamen geçmişse bayat tahmini göstermez.
- `coachingDay`: Düzeltilmiş yaş aşaması ve seçilen yaklaşıma göre birbirinden farklı günlük görev ve check-in sorularını üretir; 6 aydan küçük bebeklerde destek azaltma görevi vermez.
- `isSleepPlanPausedToday`: Kullanıcının elle duraklatma ayarıyla o günün hastalık/seyahat/diş çıkarma/düzen değişikliği check-in'ini birleştirir; UI dışında çağrılsa da günlük görev işaretleme ve plan ilerletme koruması aynı kuralı uygular.
- `createSleepCoachInsights`: Son uzun gece uykularını hedef saatle karşılaştırır ve en fazla 15 dakikalık değişim üretir. En güncel yedi tarihli check-in'i kullanır; tarihsiz, bozuk tarihli ve gelecekteki check-in'leri dışarıda bırakır. Ayrıca rutin çalıştırıcısı bitişini izleyen 3 saatte başlayan en fazla yedi gece uykusuyla eşleşme kurup rutin–uyku başlangıç aralığının ortancasını verir; son 30 gündeki en yeni yedi işaretli uyku kaydının kullanılan geçiş desteği dağılımını tıbbi veya başarı değerlendirmesi yapmadan gösterir.
- `handoffSummary`: Seçili 2/4/6/8 saatlik aralıktaki kayıtları, en son beslenme/bez/uyku saatlerini ve biberon miktarını özetler; son beslenme ve bez kaydında bakım verenin adını da gösterir. Pencere dışında başlamış olsa da açık emzirmeyi toplam ve taraf süreleriyle gösterir. Sağım geçmişi varsa tüm partilerdeki kullanılabilir toplamı, önce kullanılması gereken partinin saklama durumunu ve kullanım son saatini ekler. Olağan dışı gün bağlamı işaretliyse nedeni ve o gün koçluk planının beklediğini belirtir. Pencereyle kesişen uyku süresini, devam eden uykuyu ve sonraki 24 saatin en yakın üç görevini ekler. Bebek uyanıksa ve tahmin penceresi geçmemişse, günün sabah uyanış saatinden veya son uykudan hesaplanan sıradaki uyku penceresini de içerir. Tercih varsayılanı 4 saattir; eski yedeklerde alan yoksa migrasyon bu değeri kullanır.
- `careInstructions`: Ailenin bakım verene bırakmak istediği notları cihazda saklar; yalnızca bakım veren paylaşımı açıkça başlatıldığında devir özetine ekler. Yedeklerde taşınır ve eski veriler boş notla açılır.

### Veri katmanı

Durum `uykuva.db` dosyasında tutulur. Profil, tercih ve uyku planı JSON olarak `app_state` satırında saklanır; bakım kayıtları `care_events`, aşı/randevu gibi bakım görevleri ise `care_tasks` tablosundadır. Bu tablolar kimlik, tür ve sorgulamada kullanılan tarih alanlarını ayrı sütunlarda tutar; geri kalan ayrıntılar JSON yükünde korunur. `saveState` ilgili tabloları ve durum satırını aynı SQLite işlemi içinde günceller. Eski durum JSON'unda gömülü görevler ilk okumada tabloya taşınır.

İlk açılışta depolama göçü eski `ExpoSQLiteStorage` anahtar deposundaki `uykuva:state:v3` / v2 veya önceki `uykvua:state:v1` AsyncStorage kaydını okur; durum ve olayları yeni veritabanına yazdıktan sonra eski anahtarları temizler. Göç tamamlanamazsa kayıt kurtarma ekranı yeniden deneme sunar; uygulama boş başlangıç durumunu eski verinin üzerine yazmaz.

JSON dışa aktarımı, `app_state` ile `care_events` satırlarını tam `AppState` olarak birleştirir. Böylece yedek şeması uygulama içi SQLite tablolarından bağımsız kalır.

İlaç kaydı isteğe bağlı `medicationReminderAt` saatini olayda saklar. `scheduleMedicationReminders` her ilaç adı için en son ilaç kaydını esas alır, eski plan bildirimlerini iptal eder ve yalnızca kullanıcının açıkça girdiği gelecek saat için tek seferlik yerel bildirim kurar. Hatırlatma dozu veya aralığı söylemez; ilaç planını kontrol etmeyi hatırlatır. Bildirim izni yoksa doz kaydı yine tutulur, hatırlatma kurulmadığı açıklanır. İçe aktarılan hatırlatma tarihleri JSON doğrulamasından geçer; profil/veri sıfırlanınca zamanlanmış ilaç bildirimleri iptal edilir.

Uyku bildirimi, bakım vereni tahmini pencere öncesinde haberdar eder ve sessiz saatleri gözetir. Uyku sayacı çalışırken önceden kurulmuş uyku hatırlatmaları iptal edilir; sayaç durunca yeni tahmin için yeniden planlanır.

Yedekleme akışı `createDataExport` ile cihaz verisini biçim etiketi ve şema sürümü taşıyan JSON'a dönüştürür. `parseDataExport` boyutu, biçimi ve temel profil/kayıt yapılarını doğrular; `migrateState` veriyi geçerli şemaya dönüştürür. İçe aktarmada `expo-document-picker` dosyayı seçer; içerik mevcut JSON doğrulama ve kullanıcı onayı akışına girer. Kullanıcı aynı bebeğin yedeğini mevcut cihaz kayıtlarıyla birleştirebilir veya tüm cihaz verisini yedekle değiştirebilir. `mergeDataStates` ad, doğum tarihi ve gebelik haftası eşleşmesini arar; farklı bebekte birleştirmeyi reddeder. Aynı kimlikli olay ve görevleri yinelenmeden birleştirir; bitmiş uyku kaydını ve tamamlanmış görevi eski açık kayıtla geriye almaz. Check-in'lerdeki farklı alanları ve gece uyanma günlüklerini korur; profil, uyku planı ayarları ve cihaz tercihlerini mevcut cihazda bırakır. Metin yapıştırma seçeneği de korunur. Aile ekranındaki tek seferlik cihaz aktarımı aynı JSON dosyasını paylaşır; otomatik cihaz senkronizasyonu sağlamaz. Yedekler otomatik olarak sunucuya gönderilmez.

Kullanıcı tüm cihaz verisini silmeyi onayladığında `cancelAllCareReminders`, bekleyen ve bildirim merkezinde gösterilmiş tüm uygulama bildirimlerini kaldırmayı dener. Önbellekteki `uykuva-yedek-YYYY-AA-GG.json` dosyaları da silinir; ardından `resetState` SQLite olay, görev ve profil tablolarını temizler. Bildirim veya yedek dosyası temizliği başarısız olsa bile veri silme sürer ve sonuç ekranı kalan öğeleri açıkça bildirir.

Sağım kayıtları beslenme tüketimlerinden ayrı tutulur. `src/domain/milk.ts` sağılan süt partilerini saklama türüne göre son kullanım tarihleriyle hesaplar; sağılan süt biberonları en eski uygun partiden düşer. Tamamen çözüldü olarak işaretlenen süt için 24 saatlik, ısıtılan veya oda sıcaklığına gelen süt için iki saatlik kullanım süresi başlatılır. Depolama aralıkları CDC rehberine dayalıdır ve uygulama stok uyarısını tıbbi talimat olarak sunmaz.

Sağılan süt hatırlatması tercihi varsayılan olarak kapalıdır. Açıldığında `scheduleMilkExpiryReminders`, kullanılabilir süt partilerini son kullanım saatine göre sıralar ve en yakın 12 parti için tek seferlik yerel bildirimler planlar. Dondurulmuş süt çözülmemişse altı aylık en iyi kalite önerisine ayrı bir hatırlatma kurar; bu tarihi geçmek partiyi otomatik olarak geçersiz yapmaz. Ayrıca 12 aylık tavsiye edilen son kullanım tarihi yaklaşırken ayrı hatırlatma kurar. Diğer saklama biçimlerinde yalnızca hesaplanan kullanım sonu hatırlatılır. Sessiz saatlere denk gelen bildirim, ilgili tarihten önceki uygun sessiz saat bitişine taşınır. Kullanımı bitmiş, süresi geçmiş veya stokta kalmamış partiler için bildirim kurulmaz. Tercih eski yedeklerde kapalıya göçer ve JSON yedeklerinde doğrulanır.

Katı gıda günlüğü, `src/domain/solids.ts` içinde kaydedilen yiyecek adlarını, ilk uygulama kayıt tarihini, öğün sayısını ve seçilen alerjen etiketlerini özetler. Tepki gözlemleri öğün notuyla birlikte tarih sırasıyla gösterilir; etiketlerden veya notlardan alerji durumu çıkarılmaz.

Uyku koçluğu günü yerel takvim gününde en fazla bir kez ilerler. `SleepPlan.lastAdvancedDate` bu günü saklar; ilerletilen her gün `completedDays` geçmişine tarih, yaklaşım, odak ve tamamlanan/toplam görev sayısını yazar. Gün 14'e ulaştığında son gün ayrıca tamamlanır ve `completedDate` kaydedilir. Arayüz son yedi plan gününün görev sayılarını gösterir ve aynı gün tekrar ilerlemeyi engeller. Aynı yaklaşım/odakta altı plan günü tamamlandığında ilk üç ve son üç günün check-in kolaylık ortalaması ile açıkça sayılmış (0–4) gece uyanmalarını karşılaştırır; 5+ kayıtları sayı üst sınırı nedeniyle uyanma ortalamasından çıkarır. Eski yedeklerde geçmiş yoksa boş listeye geçiş yapılır; içe aktarılan geçmiş tarih, yöntem, odak ve sayım doğrulamasından geçer.

Uyku planı duraklatma durumu `SleepPlan.paused` alanında saklanır. Duraklatılmış planda günlük koçluk adımları etkileşime kapanır ve gün ilerlemez; bakım kayıtları ile rutin çalıştırıcısı kullanılmaya devam eder. Migrasyon eski verilerde bu alanı `false` yapar; JSON yedek doğrulaması alan yoksa eski yedekleri kabul eder.

Akşam rutini adımları ebeveyn tarafından etkinleştirilip devre dışı bırakılabilir, süreleriyle birlikte saklanır ve uygulama içi yukarı/aşağı kontrolleriyle sıralanır. Rutin çalıştırıcısı bu sırayı kullanarak tamamlanma özetini zaman çizelgesine yazar.

Anı günlüğü, `memory` türünde zaman çizelgesi olayı olarak saklanır. Önerilen başlıklar yalnızca hızlı giriş içindir. `detectRecordedMilestones`, ilk uyku/beslenme/ek gıda/ölçüm kayıtlarını, ilk dört saatlik uyku kaydını ve 100. beslenme kaydını yalnızca mevcut olaylardan bulur; gelişim basamağı veya klinik değerlendirme çıkarmaz. Ebeveyn isterse bulunan anı tek dokunuşla günlüğe ekler. `milestoneId` tekrar öneriyi önler ve JSON yedeğinde korunur.
Gelişim gözlem kartı `src/data/developmentMilestones.ts` içindeki CDC 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48 ve 60 aylık listeleri kullanır. Yaş seçimi, erken doğumda ilk iki yıl için düzeltilmiş doğum tarihini takvim ayıyla karşılaştırır; iki liste yaşı arasındaysa daha küçük yaş listesini gösterir. Çocuğun mevcut yaşına kadar olan eski listeler seçilip gözden geçirilebilir. Yanıtlar, notlar ve kontrol tarihi `developmentCheckIns` alanında yerel olarak saklanır, JSON yedeğine eklenir ve kullanıcı doktor özetini paylaştığında son kontrolün özeti de paylaşılır. Bu liste gelişim tarama aracı veya tanı değildir.

Büyüme geçmişi son sekiz kilo/boy/baş çevresi ölçümünü tarihle gösterir. İsteğe bağlı WHO eğrisi seçimiyle `src/domain/whoGrowth.ts`, WHO Anthro'nun resmî deposundaki günlük LMS tablolarından (0–1826 gün) z-skoru ve persentil hesaplar; küçük grafikler P10/P50/P90 referans çizgileri ve ölçüm noktalarını gösterir. Boy ölçümünde yatış/ayakta bilgisi saklanır ve yaşa uymayan ölçüm konumunda WHO'nun 0,7 cm düzeltmesi uygulanır. WHO verileri `src/data/{weianthro,lenanthro,hcanthro}.json` dosyalarında tutulur. Kaynak: [WHO Anthro büyüme standartları hesaplama deposu](https://github.com/WorldHealthOrganization/anthro). Eğriler bilgilendirme amaçlıdır; tıbbi yorum veya tanı oluşturmaz.

Bez özeti, `src/domain/diapers.ts` içinde son yedi yerel takvim günündeki ıslak, kirli ve ikili kayıt sayılarını ayrı toplar. Eksik bez kayıtlarını tahmin etmez; dağılım yalnızca takip kolaylığı içindir ve sağlık değerlendirmesi değildir.

Gece uyanması rehberi yaş aşamasına göre ayrılır: yeni doğanda destek ve ihtiyaçlara yanıt, hazırlık döneminde tutarlı rutin, hazır oluş koşulları tamamlandığında ise seçili yaklaşımın adımları gösterilir. Beslenme ihtiyacını ertelemeyi veya ağlamayı görmezden gelmeyi önermeyen kısa yol gösterimi sunar. Bir yaş altı için güvenli uyku notu, [AAP HealthyChildren rehberindeki](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx) sırtüstü, sert/düz yüzey ve boş uyku alanı ilkelerine bağlanır. Bebeğin farklı bireysel ihtiyaçları için metin klinik değerlendirme yerine geçmez.

Sabah check-in'i, zamanlayıcı kullanılmayan geceler için yatış ve sabah uyanış saatlerini isteğe bağlı kaydedebilir. `SleepCheckIn` bu değerleri yerel tarihle saklar; koçun gerçek yatış medyanında en az üç zamanlayıcılı gece varsa onlar, daha azı varsa kullanıcının manuel yatış özetleri kullanılır. Gece aralığı uyanık kalınan süreyi içerir ve toplam uyku süresi diye sunulmaz. Yedek doğrulaması isteğe bağlı saat alanlarını doğrular.

`summarizeNightSleep`, check-in'deki yatış/uyanış aralığını kullanır; saatler girilmemişse 18:00–12:00 penceresindeki uyku kayıtlarını toplar. Üst üste binen uyku olaylarını çift saymaz. Sabah kartı yalnızca kaydedilmiş uyku dakikalarını ve bakım verenin bildirdiği uyanma sayısını ayrı gösterir; eksik aralıkları tahmin etmez.

Koç ekranında son yedi yerel tarih içindeki check-in'ler gecelik geçmiş olarak sıralanır. Gece aralığı verisi yoksa uyku süresi için çizgi/varsayılan sayı üretilmez; yalnızca kullanıcının bildirdiği uyanma sayısı gösterilir.

## 6. Uyku tahmin motoru

Tahmin motorunun mevcut davranışı:

1. Ebeveyn sabah uyanış saatini girerse yaşa uygun düşük güvenli ilk pencereyi, uyku geçmişi olmasa da hesaplar. Bu giriş yoksa düzeltilmiş yaşı 9 haftadan küçük bebekler için saat aralığı sunmaz.
2. Bitmiş son uyku kaydını bulur.
3. Yaşa uygun genel uyanıklık aralığını seçer.
4. Son 30 takvim günündeki geçerli uyanıklık sürelerini altı yerel saat dilimine ayırır; her dilimde en fazla son 10 örneği tutar.
5. Gece diliminde en az iki, diğer dilimlerde en az beş örnek varsa ilgili dilimin medyanını yaş aralığıyla harmanlar; veri yetmezse yaş aralığını kullanır.
6. Tek saat yerine başlangıç ve bitiş aralığı üretir.
7. Veri miktarına göre düşük, orta veya yüksek güven etiketi verir.
8. Sonucun nedenini kullanıcıya düz metinle açıklar.
9. En az üç öneri–gerçek başlangıç eşleşmesi varsa son 30 günlük sapmaları kullanarak tahmin merkezini ve pencere genişliğini kişiselleştirir; kullanıcı tarafından elle eklenen eşleşmemiş kayıtlar bu hesaba girmez.

Bu motor bir tıbbi model değildir. Yayına çıkmadan önce referans aralıkları pediatri/uyku uzmanı tarafından gözden geçirilmeli ve içerik sürümüyle birlikte kaydedilmelidir.

## 7. Uyku eğitimi mimarisi

Uyku planı altı aile merkezli yaklaşım sunar. Altı aydan küçük düzeltilmiş yaşta veya dört hazırlık maddesi tamamlanmadan yöntem seçimi açılmaz; bu aşamalarda duyarlı bakım ve rutin rehberi gösterilir:

- **Duyarlı rutin:** Huzursuzluğa hızlı yanıt ve tutarlı uyku öncesi sıra.
- **Kademeli destek:** Bakım yardımını küçük adımlarla azaltma.
- **Yakında kalma:** Bakım verenin odada kalıp mesafeyi zamanla artırması.
- **Yatma saatini ayarlama:** Kayıtları gözden geçirerek yatış hedefini küçük adımlarla ayarlama.
- **Al, sakinleştir, tekrar yatır:** Belirgin huzursuzlukta kucak desteği verip sakinleşince güvenli uyku alanına geri yatırma.
- **Önce tutarlı rutin:** Desteği azaltma hedefi olmadan kısa, sakin ve tekrarlanabilir sıraya odaklanma.

Her yöntemin kendine ait günlük uygulama adımları ve gece uyanma rehberi vardır. Yöntem seçimi uyku planında ve dışa aktarılan veride saklanır; eski yedeklerdeki mevcut üç yöntem korunur, tanınmayan değerler duyarlı rutine döner. Sabit ağlama aralıkları veya temel ihtiyaçları erteleme yönergeleri sunulmaz. AAP'nin davranışsal uyku müdahaleleri özetinde yatma saatini ayarlama ve ebeveyn yakınlığını kademeli azaltma farklı yaklaşımlar olarak listelenir: [Pediatrics, Table 8](https://publications.aap.org/pediatrics/article-pdf/150/6/e2022060055/1563635/peds_2022060055.pdf).

Hazırlık kontrolü tamamlandıktan sonra aile planın odağını yatma zamanı, gece uyanmaları, gündüz uykuları veya akşam rutini olarak seçebilir. Seçilen odak, yöntemin o günkü görevlerine ve sabah check-in sorusuna ek bağlam sağlar; odağı değiştirmek o günün tamamlanma işaretlerini temizler. `SleepPlan.focus` eski kayıt ve yedeklerde yoksa akşam rutini varsayılır.

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
- Uyku kaydında isteğe bağlı sakinleşme/geçiş desteği bilgisi
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
- İlerletilen günlerin yöntem, odak ve görev sayısı geçmişi (en çok 14 gün)

Gün geçmişi, yaş ve hazır oluş koşullarına göre kullanıcıya gerçekten gösterilen yaklaşımı kaydeder. Hazır oluş maddelerinden biri kaldırılırsa koçluk duyarlı rutine döner; karşılaştırma yalnızca o yaklaşımla kaydedilmiş günleri kullanır.

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
- [x] 14 günlük uyku eğitimi/alışkanlık planı ve tamamlanan döngü arşivi eklendi; son 10 döngü başlangıç/bitiş tarihleri, günlük görev toplamları ve yöntem bilgisiyle saklanır.
- [x] Altı nazik uyku yaklaşımı; yönteme özel gece rehberi, gün adımları, yedek doğrulaması ve eski yöntem migrasyonu eklendi.
- [x] Hazır oluş koşulları tamamlandığında altı yaklaşım; yöntemin özeti, bakım verenin uygulayacağı adım ve gece uyanmasına verilecek yanıtla karşılaştırma penceresinde sunuluyor; pencereden doğrudan seçim yapılabiliyor.
- [x] Koçluk gün geçmişi, hazır oluş koşulları değişince kullanıcıya gösterilen etkin yaklaşımı kaydeder; check-in karşılaştırması aynı yaklaşım ve odağa göre yapılır.
- [x] Uyku planında yatma zamanı, gece uyanmaları, gündüz uykuları veya akşam rutini odağı seçilip günlük rehber buna göre uyarlanabiliyor.
- [x] Plan günü ilerletildiğinde yaklaşım/odak ve tamamlanan görev sayısı 14 günlük geçmişte korunuyor.
- [x] Bakım verenlerle paylaşılan uyku planı son 7 gecenin check-in ölçümlerini/notlarını ve varsa ilk/son dönem karşılaştırmasını içeriyor.
- [x] Aynı yaklaşım/odakta ilk ve son üç plan gününün check-in kolaylığı ve sayısal gece uyanması kayıtları karşılaştırılabiliyor.
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
- [x] İlaç kaydından kullanıcının girdiği sonraki kontrol saatine tek seferlik bildirim eklendi; doz ve tekrar aralığı önerilmez.
- [x] Kilo, boy ve baş çevresi ölçüm kayıtları eklendi.
- [x] Yedi günlük paylaşılabilir doktor özeti eklendi.
- [x] Manuel aşı ve doktor randevusu görevleri eklendi.
- [x] Aşı/randevu görevleri, tamamlama geçmişi korunarak tarih, saat ve notlarıyla düzenlenebilir.
- [x] Aşı/randevu tarihi doğrulaması takvimde olmayan günlerin sonraki aya yuvarlanmasını engeller; yeni görev varsayılanı yerel takvimde yarındır.
- [x] Ulusal çocukluk takvimi yaş dönümü önerileri eklendi; Hepatit B doğum dozu ve 48. ay suçiçeği ikinci dozu dahil.
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
- [x] Yaklaşan doktor randevuları ve hazırlık notları paylaşılabilir doktor özetine ekleniyor.
- [x] Randevu formu doktor soruları ve notları alanını uyku, beslenme ve büyüme örnekleriyle açıkça sunuyor.
- [x] Tamamlanan aşı ve randevular için tarihli geçmiş gösteriliyor; son 20 tamamlanan aşı doktor özetinde uygulamada işaretleme tarihi ve planlanan tarihle ayrı belirtiliyor. Görev silme işlemi kullanıcı onayına bağlıdır.
- [x] Aşı ve doktor randevuları için sessiz saatleri gözeten yerel hatırlatmalar eklendi.
- [x] Son bez kaydına göre 2/3/4 saat seçenekli, sessiz saatleri gözeten tek seferlik kontrol hatırlatması eklendi.
- [x] Uyku koçluğu yaş aşamasına göre ritim temellerine geçiyor; plan yaklaşımları hazırlık listesi tamamlanana kadar açılmıyor.
- [x] Sabah değerlendirmesinde gece uyanmaları kaydediliyor ve son yedi check-in ortalaması gösteriliyor.
- [x] Zamanlayıcı kullanılmayan geceler için manuel yatış/sabah uyanış özeti ve koçun yatış medyanına veri kaynağı eklendi.
- [x] Sabah check-in'inde gece uyku kayıtları toplamı ve ebeveynin bildirdiği uyanma sayısı bir arada gösteriliyor.
- [x] Son yedi check-in gecesinin kayıtlı uyku ve uyanma özeti listeleniyor.
- [x] Katı öğünlerde takip etiketleri ve ebeveyn gözlemi zaman çizelgesi, devir özeti ve doktor özetinde saklanıyor.
- [x] Son yedi günün uyku süreleri, gece yarısını aşan dönemler günlere dağıtılarak grafikte gösteriliyor.
- [x] Zaman çizelgesinden geçmiş uyku ekleme ve kayıt saatlerini düzenleme eklendi.
- [x] Zaman çizelgesinden tüm bakım kayıtlarının tarih ve saatini içeriği koruyarak düzeltme eklendi.
- [x] Zaman çizelgesi kaydı silme işlemi ikinci onay ister; uzun basma tek başına kaydı silmez.
- [x] Uyku tahmini kişisel uyanıklık örneklerini son 30 günle sınırlar ve aktif uyku süresini canlı gösterir.
- [x] Son tamamlanmış uyku seçimi de son 14 gün ve şu ana kadar olan geçerli kayıtlarla sınırlanır; uzun kayıt aralarında eski bir uykudan tahmin üretilmez.
- [x] Uyku/beslenme tahminleri, hedef yatış ve bakım görevleri Bugün ekranında saat sıralı tek 24 saat planında birleştirildi; yatış hedefi geçmişse ertesi güne taşınır.
- [x] Yeterli kayıt bulunan sonraki gündüz uykuları 24 saatlik plana tarihsel, yaklaşık aralık olarak eklenir; tamamlanan uykular ve sıradaki uyku tahminiyle çakışan taslaklar tekrarlanmaz.
- [x] Tamamı geçmiş beslenme tahmin aralığı gösterilmez; yeni kayıt beklenir.
- [x] 12 saati aşan açık uyku sayacı uygulama açıkken zamanlayıcı güncellemesiyle veya uygulamaya dönüldüğünde teyit edilir; süre otomatik tamamlanmaz, kullanıcı gerçek uyanış saatini düzenleyebilir.
- [x] 9 haftadan küçük bebeklerde uyku, beslenme, bez ve sağlık özeti takvim günü yerine son 24 saati kapsar.
- [x] Tahmin aralığı geçtikten sonra kaydı olmayan bakım verene bir kez sorar ve gözden geçirilebilir tarihli kayıt açar.
- [x] Uyku tahmin motoru için birim testleri yazıldı.
- [x] Tüm özellikler ücretsiz bırakıldı; ödeme sistemi eklenmedi.
- [x] Kayıtlardan ilk uyku/beslenme/ek gıda/ölçüm, dört saatlik uyku ve 100. beslenme anı isteğe bağlı tespit edilip anı günlüğüne eklenebiliyor.
- [x] Son yedi günün ıslak, kirli ve ikili bez kayıtları ayrı trend grafiğinde gösteriliyor.

## 10. Uyku koçluğu kapsamı ve kalan işler

Whispie'nin resmi ürün sayfası, 6 aydan itibaren altı yöntemli uyku koçluğu sunduğunu belirtiyor ([Whispie özellikleri](https://www.whispieapp.com/whispie/)). Uykuva'da da altı yaklaşım, yaşa bağlı hazır oluş kapısı, günlük 14 günlük rehber, gece uyanması rehberi, sabah check-in'i, duraklatma ve tamamlanan program arşivi bulunuyor. Uykuva tüm koçluk özelliklerini ücretsiz tutuyor.

Öne çıkan ürün farkı çoklu cihaz işbirliğinde: Uykuva şu an aynı cihazda bakım veren profilleri ve paylaşılabilir devir/plan özetleri sunuyor; davetle başka telefondan eşzamanlı kayıt ve rol bazlı erişim henüz yok. Whispie'nin aile daveti ve rol bazlı görünüm özellikleriyle aradaki farkı kapatmak için sonraki büyük iş güvenli hesap, davet ve çevrimdışı senkronizasyon tasarımıdır. Mevcut cihaz içi SQLite depolamasını koruyarak bu akışın veri birleştirme ve çakışma kuralları ayrıca tanımlanmalıdır.

Uyku koçluğu ve tahminler ebeveynin gözlemlerinin yerine geçmez. Mevcut yaş sınırları, hazır oluş maddeleri, hastalık/seyahat duraklatması ve sağlık uzmanına yönlendirme metinleri korunmalıdır.

Randevular tek seferlik, haftalık veya aylık olarak ayarlanabilir. Tekrarlanan sonraki randevu, mevcut kayıt tamamlandığında oluşturulur; geçmişteki tamamlanmış kayıt silinmez. Aşı kayıtları tekrarlama seçeneği almaz. Bildirim tercihi açıksa sıradaki örnek mevcut randevu hatırlatma zamanlamasına girer.

Gece modu girişinde ekran okuyucu etiketi ve eylem ipucu bulunur. Gece modu giriş/çıkış hedefleri en az 48 dp, uyku/beslenme/bez hızlı eylemleri en az 88 dp, ortak seçim etiketleri en az 48 dp yüksekliğindedir. Rutin sıralama, kayıt silme, uyku değerlendirme ve gelişim dönüm noktası seçimlerinin dokunma hedefleri de en az 48 dp'dir. Metinler sistemin varsayılan yazı ölçeklendirmesini kullanır; bu düzenleme tam erişilebilirlik denetiminin yerini almaz.

Uyku koçu son üç yerel check-in'i tarihe göre inceler. 5+ uyanma veya tekrarlayan zor gecelerde daha fazla destek ve temel ihtiyaç kontrolü önerir; daha kolay gecelerde mevcut rutini korumayı söyler. Bu rehber plan yöntemini otomatik değiştirmez, beslenmeyi ertelemez ve uyku başarısı/sağlık sonucu iddiasında bulunmaz.

- [x] Bakım olaylarını ayrı `care_events` SQLite tablosuna taşıma; eski SQLite KV ve AsyncStorage durum anahtarlarından güvenli ilk açılış göçü
- [x] Bakım görevlerini indeksli `care_tasks` SQLite tablosuna taşıma; gömülü eski görevleri ilk okumada kayıpsız aktarma
- [ ] Diğer büyüyen veri kümelerini normalize tablolara ayırma
- [ ] Güvenli hesap sistemi ve çoklu cihaz senkronizasyonu
- [ ] Telefonlar arası bakım veren daveti ve bulut erişim yönetimi
- [x] Randevular için haftalık/aylık tekrar; tamamlanan her örnekten sonra sıradaki örnek açılır ve geçmiş kayıt saklanır.
- [ ] Ayrıntılı bildirim zamanlama seçenekleri
- [x] Android ana ekran uyku widget'ı eklendi; Android dışındaki widget/Live Activity desteği açık
- [x] Tamamlanan 14 günlük uyku planı döngülerinin en çok 10 tanesi, başlangıç/bitiş tarihleri ve görev geçmişiyle saklanır ve koç ekranında listelenir.
- [x] WHO 0–5 yaş kilo, boy ve baş çevresi z-skor tablolarıyla persentil eğrileri; kız/erkek eğrisi profilde isteğe bağlı seçilir
- [x] Aşı önerisinde kaynak sürümü, resmi duyuru bağlantısı ve 49–72 ay suçiçeği yakalama dönemi için hekimle teyit uyarısı gösteriliyor.
- [ ] Aşı kartı/e-Nabızdan doğrulanan doz geçmişiyle kişiye özel, hekim onaylı eksik doz akışı
- [x] Ek gıda/alerjen etiket geçmişi ve gözlem notlarının Özet ekranında listelenmesi; tıbbi yorum yapılmaması
- [ ] Sesli Türkçe kayıt
- [ ] İkiz ve çoklu bebek desteği
- [ ] Erişilebilirlik testi, ekran okuyucu etiketleri ve dinamik yazı boyutu
- [ ] KVKK aydınlatma/açık rıza akışları, veri dışa aktarma ve silme ekranları
- [ ] Uzman içerik incelemesi ve klinik kaynak sürümleme
- [ ] Gerçek cihaz, mağaza ve uçtan uca testleri

## 11. Sonraki geliştirme sırası

1. Görev hatırlatmaları ve güvenilir zamanlayıcılar
2. Aile hesabı, davet ve çevrimdışı senkronizasyon
3. Ek dozlar için hekim yönlendirmeli aşı akışı
4. iOS Live Activity, saat uygulamaları ve Türkçe sesli kayıt
5. İçerik/uyku planlarının uzman doğrulaması
6. Kapalı beta, erişilebilirlik ve mağaza hazırlığı

## 12. Güvenlik ve mevzuat notları

- Bebek ve sağlıkla ilişkili kayıtlar hassas veri kabul edilerek tasarlanmalıdır.
- Bulut senkronizasyonu eklenirse aktarımda TLS, depoda şifreleme ve ayrıntılı erişim denetimi zorunludur.
- Üretim analitiğinde olay ayrıntıları, bebek adı, doğum tarihi veya bakım notu bulunmamalıdır.
- Bulut sağlayıcı ve yurt dışı aktarımı seçilmeden önce KVKK aktarım mekanizması belirlenmelidir.
- Yerel cihaz verisini silme ve makinece okunabilir dışa aktarma akışları uygulama içinde bulunmalıdır. Hesap sistemi eklenirse hesap silme akışı da eklenmelidir.
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

27 Ekim 2026 tarihinde:

- `npm.cmd run typecheck`: başarılı
- `npm.cmd test`: 26/26 test başarılı
- `npx.cmd expo-doctor`: 20/20 kontrol başarılı
- `npx.cmd expo export --platform android`: Android üretim paketi başarıyla oluşturuldu
- Android `:app:assembleDebug`: başarılı; APK emülatöre kuruldu

`npm audit`, Expo CLI'nin dolaylı olarak kullandığı `node-forge` ve `zod` paketlerinde beş yüksek önem dereceli bildirim göstermektedir. npm'nin önerdiği otomatik zorlanmış çözüm Expo'yu 44 sürümüne düşürdüğü için uygulanmamıştır; bu kırıcı ve güvensiz bir sürüm gerilemesi olur. Bağımlılıklar Expo SDK 58 güncellemeleriyle takip edilmelidir. Bu paketler mevcut uygulama özelliklerinde kullanıcı verisini işleyen özel bir sunucu katmanı değildir, ancak mağaza sürümünden önce bildirimler yeniden değerlendirilmelidir.
