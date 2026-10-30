# Uykuva — Ürün ve Teknik Mimari

Son güncelleme: 30 Ekim 2026

Uygulama açıldığında Bugün ekranı gösterilir. Gece uyanması kayıt formu başlangıçta kapalıdır ve Bugün ekranındaki Uyanma kısayoluyla açılır; uygulama arka plandan öne geldiğinde açık form kapatılır ve ana ekrana dönülür.

Bugünün gerçek uyanış saati yerel saatten ileri olamaz; geçersiz gelecek saat otomatik kaydedilmez ve elle kaydetme uyarıyla durdurulur. Bugün ekranında kaydedilmiş uyanış saati temizlenebilir; diğer check-in alanları korunur.

Gece uykusu tam sabah uyanışında bitiyorsa ilk gündüz uykusu gerçekleşmiş sayılmaz. Uyanışta veya sonrasında başlayan ya da uyanıştan sonra biten bir uyku kaydı varsa sonraki pencere uyku kayıtlarına göre hesaplanır.

Uyku zamanlayıcısı çalışırken Bugün ve Uyku planı ekranları eski sonraki uyku penceresi yerine uyanışın kaydedilmesini bekleyen açıklamayı gösterir; Bugün planına tahmini sonraki uyku aralığı eklenmez.

Olası uyanış hatırlatması varsayılan olarak kapalıdır ve Aile ekranından açılır. Devam eden uyku için aynı gündüz/gece diliminde son 30 günden en az beş tamamlanmış benzer uyku varsa, geçmiş sürelerin ortancasından tahmini uyanış hesaplanır. Kullanıcının seçtiği 5–30 dakikalık ön bildirim cihazda planlanır; zamanı geçmiş veya sessiz saatlere denk gelen bildirim atlanır. İlgili çocuk için hastalık, seyahat, diş çıkarma veya düzen değişikliği günü işaretliyse bildirim planlanmaz. Uyku bitince, ayar kapanınca veya tahmin değişince bekleyen uyanış bildirimleri yeniden düzenlenir. Her çocuk kendi geçmişiyle değerlendirilir ve bildirime dokunmak ilgili çocuğun Bugün ekranını açar. Bu bir uyanma alarmı veya kesin saat değildir.

Uyanış bildirimi planlaması `src/domain/wakeReminders.ts` içindeki sıralı koordinatörle yürütülür. Yeni ayar, sürmekte olan planlama tamamlandıktan sonra eski uyanış bildirimlerini iptal eder; böylece hızlı kapatma sırasında geç eklenen bir bildirimin kalması önlenir. Cihaz API çağrıları `src/services/notifications.ts` üzerinden yapılır; koordinatörün çoklu çocuk ve eş zamanlı kapatma davranışı ile servis katmanının tarih, çocuk kimliği ve bildirim türüne göre iptali sahte bildirim adaptörleriyle test edilir. Gerçek işletim sistemi teslimi ayrıca cihaz testi gerektirir.

Kişisel uyanıklık aralıkları çıkarılırken zamanları çakışan tamamlanmış uyku kayıtları hesaplama için birleştirilir. Böylece iç içe kayıtlar aradaki uyanıklığı olduğundan uzun göstermez; orijinal kayıtlar değiştirilmez.

Bugün ve Özet ekranlarındaki uyku süresi, haftalık grafik ve bakım devri toplamı, çakışan uyku aralıklarını yalnızca bir kez sayar. Gece yarısını aşan uykular yerel günlere bölünür; devam eden uyku o anki zamana kadar hesaplanır. Kayıt sayısı ayrı olay sayısı olarak kalır.

Doktorla paylaşılan yedi günlük özette yalnızca tamamlanmış uykular sayılır; toplam süre özet sınırlarıyla kesilir ve çakışan dakikalar bir kez eklenir. Sınırdan önce başlayıp özet döneminde biten uykunun dönem içindeki bölümü de toplama katılır.

Gece modu, Bugün ekranından açılır; ana başlık ve alt gezinmeyi gizleyip koyu temalı uyku sayacı ile uyku/beslenme/bez kısayolları gösterir. Uyku kaydı mevcut durum yönetimini kullanır, diğer kayıtlar mevcut kayıt formlarını açar. Üstteki çıkış düğmesi normal arayüze döner. Bu özellik yalnızca uygulama renklerini değiştirir; cihazın ekran parlaklığını veya işletim sistemi gece ayarını değiştirmez. Bugün ekranındaki saat sıralı 24 saatlik plan; kullanılabilir uyku ve beslenme tahminlerini, geçmiş kayıtlardan çıkarılan sonraki gündüz uykusu taslaklarını, hedef yatışı ve yaklaşan aşı/randevuları birleştirir. Hedef yatış geçmişte kaldıysa yarın için gösterilir; görevler plandan tamamlanabilir veya silinebilir.

Randevu görevleri isteğe bağlı not alanında hazırlık notlarını saklar. Notlar görev kartında görünür ve paylaşılan doktor özetine en yakın beş gelecek randevuyla birlikte eklenir; tamamlanmış veya geçmiş randevular özete alınmaz. Aşı ve randevulara bakım veren atanabilir; görev listesinde, hatırlatma bildiriminde ve devir özetinde sorumlu kişi görünür. Tekrarlanan randevu yeni tarihe geçerken atamayı korur. Bakım devri özeti, koçluk beklemede değilse bugünün tamamlanmamış yaklaşım görevlerini de aktarır.

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
| Anı fotoğrafları | Expo Image Picker + Image Manipulator | Kullanıcının seçtiği fotoğrafı 1280 piksel sınırına ve yaklaşık 0,8 MB boyuta küçültür; veri URI'si olayın SQLite JSON yükünde saklanır |
| Türkçe sesli not | `expo-speech-recognition` 58 | Bakım, sağlık, anı ve devir talimatlarında konuşmayı yazıya çevirir; kurulu çevrimdışı Türkçe modeli varsa cihazda tanır, yoksa işletim sistemi konuşma hizmetine geçmeden açık onay ister |
| Test | TypeScript derleyicisi + Node test runner | Uyku motorunu arayüzden bağımsız test etme |
| Durum yönetimi | React hook'ları | Mevcut ölçek için düşük karmaşıklık |

Sesli not yalnızca kullanıcı mikrofon düğmesine dokunduğunda başlar. Mikrofon izni o anda istenir. Ses dosyası kaydedilmez; son metin ilgili not alanına eklenir ve normal uygulama verisiyle aynı şekilde cihazda tutulur. Çevrimdışı Türkçe modeli yoksa işletim sistemi hizmeti konuşmayı ağ üzerinden işleyebileceği için devam etmeden önce uyarı gösterilir. Yeni yerel modül nedeniyle Android/iOS geliştirme sürümü yeniden derlenmelidir.

İsteğe bağlı aile eşitlemesi Supabase PostgreSQL ve RLS şemasını kullanır. `src/services/cloudSync.ts` Supabase oturumunu ve aile şifreleme anahtarını Expo SecureStore'da tutar; hassas profil verisini cihazda AES-GCM ile şifreledikten sonra elle gönderir. Supabase bağlantısı yoksa eşitleme kapalıdır. Sağlık verileri uygulama günlüklerine veya analitik olaylarına yazılmaz. 30 Ekim 2026'da yerel Supabase Postgres 17 üzerinde migration uygulandı; 17 pgTAP RLS testi geçti ve db lint hata bulmadı. Barındırılan Supabase yapılandırması ve gerçek iki cihazlı eşitleme henüz doğrulanmadı.

`supabase/migrations` altında ilk aile eşitleme şeması ve `supabase/tests` altında pgTAP izin testi bulunur. Yerel migration ve pgTAP testleri README'deki `npm.cmd run db:start`, `npm.cmd run db:test` ve `npm.cmd run db:stop` komutlarıyla çalıştırılır. Migration henüz barındırılan Supabase projesine uygulanmamıştır; gerçek iki cihazlı senaryo bekliyor. Eşitleme istemcisi isteğe bağlı yapılandırma ve aile ekranındaki açık onayla etkinleşir.

Android ana ekran widget'ı `plugins/withUykuvaWidget.js` Expo config plugin'iyle oluşturulur. Plugin Android manifest'ine sağlayıcıyı ekler; Kotlin sağlayıcı/modülünü ve widget kaynaklarını yazar, React Native paketini `MainApplication` içine kaydeder. `App.tsx`, uygulama açıkken güncel bebek adını, uyku penceresi ve durumunu, ayrıca en az dört benzer süt beslenmesi kaydı varsa kişisel beslenme aralığını yerel widget depolamasına gönderir. Yeterli kayıt yoksa widget bunu açıkça belirtir; beslenme zamanı uydurmaz. Öngörüler saat hedefi değildir ve bebeğin açlık/tokluk işaretlerinin yerini almaz. Android widget'ı en az 30 dakikalık işletim sistemi yenilemesini kullanır ve dokunulduğunda uygulamayı açar. Bu Android'e özgüdür; otomatik bulut senkronizasyonu veya iOS widget'ı sağlamaz. Böylece `expo prebuild` çalıştırıldığında yerel değişikliklerin kaybolmaması hedeflenir.

## 4. Dizin yapısı

```text
Uykuva/
├── App.tsx                         # Uygulama kabuğu, sekmeler ve ekran bileşimi
├── app.json                        # Expo, iOS ve Android uygulama ayarları
├── package.json                    # Komutlar ve bağımlılıklar
├── src/
│   ├── state/
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
│       └── notifications.ts        # Uyku, akşam rutini, bez kontrolü ve görev hatırlatmaları
├── supabase/
│   ├── migrations/                 # Aile eşitleme için PostgreSQL şeması
│   └── tests/                      # RLS için pgTAP izin testleri
└── ARCHITECTURE.md                 # Bu doküman
```

## 5. Uygulama katmanları

### Sunum katmanı

`App.tsx`, alt gezinmeyi ve altı ana alanı içerir:

- **Bugün:** Sıradaki uyku aralığı, hızlı kayıt, bakım devri ve son kayıtlar.
- **Akış:** Uyku, beslenme, bez ve notların ortak zaman çizelgesi.
- **Emzirme:** Tek oturumda sol/sağ taraf değişimi ve taraf başına ayrı süre; eski kayıtlar toplam süre olarak okunmaya devam eder.
- **Uyku:** 14 günlük uyku planı, yedi yaklaşım, günlük görevler ve akşam rutini.
- **Özet:** Günlük toplamlar ve paylaşılabilir doktor raporu.
- **Aile:** Bakım rolleri, devir özeti ve paylaşım.

Zaman çizelgesi, kayıt türüne göre filtreleri, kayıt içeriği/bakım veren adına göre yerel metin aramasını ve birden fazla bakım veren varsa tek dokunuşlu kişi filtresini sunar; kayıt verileri depoda değişmeden kalır. Birden fazla bakım veren tanımlıysa üst başlıktan veya gece modundan etkin kişi değiştirilir; yeni uyku, beslenme, bez ve diğer bakım kayıtları seçili kişinin adıyla saklanır. Bir kaydı silmek için uzun basma ve ayrıca kullanıcı onayı gerekir.

### Ulusal aşı takvimi önerileri

`src/domain/vaccineSchedule.ts`, Türkiye ulusal çocukluk dönemi takvimindeki yaş dönüm noktalarından tarih önerileri üretir. Yaş, ay sonuna ve artık yıla denk gelen doğum günlerini takvim ayı ekleyerek hesaplar; doğum günündeki öneri gün sonuna kadar görünür kalır. `TURKEY_VACCINE_SCHEDULE_BASE_VERSION`, `TURKEY_VACCINE_SCHEDULE_UPDATE_DATE` ve `TURKEY_VACCINE_SCHEDULE_UPDATE_SOURCE` önerinin temel sürümünü ve 1 Eylül 2026 güncelleme kaynağını gösterir. Öneri penceresi resmi duyuruya bağlantı verir; 49–72 ayda ikinci suçiçeği dozu kaydı yoksa aile hekimiyle kayıtları teyit etme uyarısı gösterir. Uygulama geçmiş dozları veya eksik doz gerekliliğini kendisi belirlemez; öneriler kullanıcı ayrıca takvime eklemeden kayıt oluşturmaz.

Takvim verisi Sağlık Bakanlığının [2025 ulusal çocukluk dönemi aşı kartına](https://hsgm.saglik.gov.tr/depo/birimler/asi-ile-onlenebilir-hastaliklar-db/dokumanlar/2025/asi_haftasi/50X30_asi_karti.pdf) dayanır; Hepatit B doğum dozunu içerir. Bakanlığın [1 Eylül 2026 güncellemesi](https://iskilipdh.saglik.gov.tr/TR-1590795/cocukluk-donemi-asilama-takvimi-guncellendi-sucicegi-asisinda-ikinci-doz-uygulamasi-basladi.html) ikinci suçiçeği dozunu 48. aya eklemiştir. Takvim ve öneri tarihleri aile hekimiyle doğrulanmalıdır.

Uyku koçu, seçilen yaklaşımı, hedef saatleri, etkin akşam rutini adımlarını, son yedi gecenin check-in'lerini ve 14 günlük programın kalanından en fazla yedi yönteme/yaşa/odağa özel günlük planı metin olarak veya A4 PDF halinde diğer bakım verenlerle paylaşabilir. Olağan dışı gün seçilmişse plan o günü atlar ve paylaşımda ilerlemediğini açıkça belirtir; elle duraklatılmış veya tamamlanmış planda yeni adım gösterilmez. PDF içeriği uygulama içinde HTML'den üretilir ve yerel paylaşım menüsünde açılır; paylaşım sunucuya yüklenmez. Metin ve PDF aynı rapor oluşturucudan beslenir.

Akşam rutini yürütücüsü, etkin adımları sırayla gösterir; adım tamamlamayı veya atlamayı takip eder. Rutin bitirildiğinde tamamlanan adım sayısı ve yaklaşık süre, etkin bakım veren adına zaman çizelgesine bir not olarak eklenir.

Sabah uyku check-in'i kolaylık puanı ve gece uyanma sayısına ek olarak isteğe bağlı yatış/uyanış saatleri ve kısa bağlam notu saklar. Bu check-in notları günlük doktor özetine dahil edilmez; cihaz verisi dışa aktarımında yer alır.

Bugün ekranındaki `Uyanma` kısayolu, her gece uyanmasında tarih/saat ve verilen desteği (`beslenme`, `sakinleştirme/yakınlık`, `bez/temel ihtiyaç`, `diğer`) bir check-in altında kaydeder; zaman son 24 saat içinde düzeltilebilir. Saatli kayıtlar elle bildirilen toplam uyanma sayısından ayrı tutulur, son 30 kayıtla sınırlanır; yanlış kayıtlar silinebilir. Bakım devri ve yedi günlük doktor özetinde bakım veren adıyla gösterilir. Bu, aile gözlem kaydıdır; uyku veya sağlık sonucu değerlendirmesi üretmez.

Uyku koçu saatli gece uyanmalarını son yedi yerel takvim gününde yanıt türüne göre sayar. Yinelenen kayıt kimlikleri, bozuk saatler ve gelecekteki saatler dışarıda bırakılır. Bu görünüm yalnızca aile kayıtlarının özetidir; beslenme zamanlaması, uyku yöntemi veya sağlık sonucu önermez.

Bugün ekranındaki sabah uyanış alanı, rakamlar yazılırken ham girişi korur; böylece `0700` gibi dört haneli saatler yazım sırasında erken biçimlenip bozulmaz. Saat geçerli olduğunda ilk uyku penceresi anında gösterilir, alan odaktan çıkınca veya kullanıcı kaydedince `SS:DD` biçiminde sunulur; kaydetmek isteğe bağlıdır. Etkin akşam rutininin toplam süresi sıfırdan büyükse, aynı kart rutine yaklaşık başlangıç aralığını da pencerenin başlangıç ve bitişinden bu süre çıkarılarak gösterir. Bu, ailenin kendi rutin süresine dayalı planlama yardımcısıdır; uyku işaretlerinin yerine geçmez. Uyku koçluğundaki sabah check-in alanı da aynı uyku önizlemesini sunar. Check-in kaydedilince sabah saati Bugün ekranındaki ilk pencere için başlangıç noktası olur; bu uyanıştan sonraki ilk uyku kaydedilince tahmin son uykunun bitişinden devam eder. Dokuz haftadan küçük düzeltilmiş yaşta girilmiş uyanış saati varsa düşük güvenli yaş aralığı gösterilir; saat girilmediyse yalnızca açıklama sunulur.

Bugün ekranındaki hızlı bakım özeti, dokuz haftadan küçük düzeltilmiş yaşta son 24 saati; daha büyük bebeklerde yerel takvim gününü kapsar. Kayıtlı uyku dakikası, beslenme, bez ve sağlık kaydı sayılarını gösterir. Aralık kuralı Özet ekranındaki dönemle eşleşir ve eksik kayıtların olabileceği açıkça belirtilir; bu sayılar klinik eşik veya sağlık yorumu değildir. Önümüzdeki 24 saat planı, ilaç adlarına göre en son kayıt edilmiş hatırlatma saatlerini de ekler; yalnızca kullanıcının sağlık planından girdiği saat gösterilir ve bu satır ilaç ya da doz önerisi değildir.

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
- `wakeWindowGuide`: Aynı yaş bantlarını Uyku ekranındaki açılır rehbere verir ve erken doğumda düzeltilmiş yaşa göre geçerli bandı vurgular; rehber aralıkları tıbbi öneri olarak sunulmaz.
- `createAwakeWindowInsights`: Tahmin motoruyla aynı 30 günlük altı dilim örneklerini özetler. Yeterli örnek yoksa kişisel medyanı gizler ve yaş rehberinin geçerli olduğunu bildirir.
- `createSleepForecast`: Son 14 gün içindeki en son tamamlanmış uykuyu kullanır; gelecekteki veya 14 günü aşan eski kayıtla pencere üretmez. Kişisel uyanıklık örneklerini son 30 günden toplar, yaş aralığıyla harmanlar ve kişisel/yaş bandı dışındaki uç değerleri yaş aralığında sınırlar. Tahmin aralığından sonra ebeveynin onaylayarak açtığı uyku kaydı, önerilen başlangıç/bitişi de saklar; en az üç eşleşme olduğunda son 30 gündeki gerçek başlangıç sapması pencerenin merkezini, hata dağılımı genişliğini ayarlar.
- `estimateSleepWakeWindow`: Devam eden uykunun saat dilimindeki son 30 günlük benzer uyku sürelerinden, en az beş kayıt varsa ortanca ve çeyrekler arası uyanma aralığı üretir; bildirim veya kesin saat oluşturmaz.
- `createDailyNapOutline`: Son 14 günde en az üç farklı güne ait yeterli gündüz uykusu varsa sıra numarasına göre tarihsel saat aralığı çıkarır; bugünkü kaydı tarihsel aralığın yanında gösterir. Bugünkü planda henüz kaydedilmemiş, gelecekteki uyku taslakları sonraki uyku tahminiyle çakışmıyorsa listelenir.
- `compareNapPatterns`: Önceki ve son yedi tam yerel günü ayrı inceler; bitmiş 15–240 dakika arası gündüz uykularının kayıt bulunduğu gün başına medyanını hesaplar. Her haftada en az dört kayıtlı gün yoksa karşılaştırma sunmaz. Sonucu yalnızca kaydedilen örüntü olarak açıklar, kestirme geçişi tahmin etmez.
- `createFeedingForecast`: Son 30 gündeki geçerli emzirme/biberon başlangıçlarından en fazla 11 tanesinin medyanıyla süt beslenmesi aralığı üretir. Katı gıda ve sağım kayıtlarını, gelecek/bozuk tarihleri dışarıda bırakır; en az dört benzer kayıt yoksa nedenini Bugün ekranında açıklar.
- `coachingDay`: Düzeltilmiş yaş aşaması ve seçilen yaklaşıma göre birbirinden farklı günlük görev ve check-in sorularını üretir; 6 aydan küçük bebeklerde destek azaltma görevi vermez.
- Sabah check-in'i `appliedMethod` alanında önceki gece gerçekte uygulanan yaklaşımı isteğe bağlı saklar. Yöntem seçimi planı değiştirmez; plan karşılaştırması yalnızca plan yöntemiyle eşleşen veya eski kayıtlar gibi yöntemi belirtilmemiş gecelerin ölçümlerini kullanır. Yöntemi farklı olduğu açıkça belirtilen gece sonuç hesabından çıkarılır. Alan yerel yedeklerde doğrulanır ve eski cihaz verileri geçerli yöntemlerle normalize edilir.
- `compareSleepPlanCheckIns`: Plan günlerini kaydedilmiş yaklaşım/odakla eşleştirir; ilk ve son üç günlük check-in özetini üretir. Check-in'de farklı uygulandığı bildirilen gecelerin ölçümlerini dışarıda bırakır; yöntemi belirtilmemiş tarihsel kayıtları geriye dönük uyumluluk için tutar. Bu karşılaştırma yöntem etkinliği veya sağlık sonucu göstermez.
- `SleepCheckIn.sustainability`: Bakım verenin o gece kullanılan yaklaşımın aile düzenine uyumuna verdiği isteğe bağlı 1–5 puanı saklar. Plan karşılaştırması bunu uyku kolaylığı ve uyanma sayısından ayrı hesaplar; ortalama için iki kayıt ister. Paylaşım yalnızca plan özetini kullanıcı başlattığında yapılır. Puan başarı veya bakım kalitesi ölçüsü olarak yorumlanmaz.
- `SleepCheckIn.planReflection`: Günün yönteme/yaş aşamasına özel koçluk sorusuna isteğe bağlı, 300 karakterlik yanıt. Yerel yedekte tutulur, doktor özetine girmez; yalnızca kullanıcı uyku planını paylaşmayı başlatınca son yedi check-in ile birlikte paylaşılır.
- `detectRecordedMilestones`: Geçmişteki uyku, beslenme türleri, bez, sağlık ve büyüme kayıtlarından 13 anı önerisi çıkarır; gelecekteki kayıtları dışarıda bırakır ve gelişimsel kazanım çıkarsamaz. Anılara ekleme ebeveyn seçimine bağlıdır.
- `isSleepPlanPausedToday`: Kullanıcının elle duraklatma ayarıyla o günün hastalık/seyahat/diş çıkarma/düzen değişikliği check-in'ini birleştirir; UI dışında çağrılsa da günlük görev işaretleme ve plan ilerletme koruması aynı kuralı uygular.
- `createSleepCoachInsights`: Son uzun gece uykularını hedef saatle karşılaştırır ve en fazla 15 dakikalık değişim üretir. En güncel yedi tarihli check-in'i kullanır; tarihsiz, bozuk tarihli ve gelecekteki check-in'leri dışarıda bırakır. Ayrıca rutin çalıştırıcısı bitişini izleyen 3 saatte başlayan en fazla yedi gece uykusuyla rutin–uyku başlangıç ortancasını; check-in'deki gece yatış saatinden sonraki ilk gece uykusuna kadar olan süreyi eşleşen son/önceki 7 takvim gününün her biri için en az 3 kayıtta uyku başlangıç ortancasını hesaplar. İki dönem yeterli örneğe sahipse ortanca farkını dakika olarak verir; fark tek başına plan değişikliği önermez. Hesaplamada çağıranın verdiği yerel `now` kullanılır. Son 30 gündeki en yeni yedi işaretli uyku kaydının kullanılan geçiş desteği dağılımını tıbbi veya başarı değerlendirmesi yapmadan gösterir. Yatış–başlangıç farkı tek başına yatış saati değişikliği önermez.
- `handoffSummary`: Seçili 2/4/6/8 saatlik aralıktaki kayıtları, en son beslenme/bez/uyku saatlerini ve biberon miktarını özetler; son beslenme ve bez kaydında bakım verenin adını da gösterir. Paylaşımı satır satır biçimlendirir; kayıtlı yatış hedefini, plan etkinse yaş ve hazır oluş aşamasına uygun uyku yaklaşımını ve etkin akşam rutini adımlarını ekler. Plan duraklatılmışsa seçili yaklaşımı aktifmiş gibi göstermez. Pencere dışında başlamış olsa da açık emzirmeyi toplam ve taraf süreleriyle gösterir. Sağım geçmişi varsa tüm partilerdeki kullanılabilir toplamı, önce kullanılması gereken partinin saklama durumunu ve kullanım son saatini ekler. Seçilen devir aralığına düşen, her ilaç adına ait en güncel kayda kullanıcı tarafından girilmiş kontrol saatlerini ayrıca gösterir; ilaç/doz zamanı önermez. Olağan dışı gün bağlamı işaretliyse nedeni ve o gün koçluk planının beklediğini belirtir. Pencereyle kesişen uyku süresini, devam eden uykuyu ve sonraki 24 saatin en yakın üç görevini ekler. Bebek uyanıksa ve tahmin penceresi geçmemişse, günün sabah uyanış saatinden veya son uykudan hesaplanan sıradaki uyku penceresini ve tahmin güven düzeyini içerir. Güven düzeyi yaş bandı ve kişisel kayıt miktarını açıklar, kesin program değildir. Tercih varsayılanı 4 saattir; eski yedeklerde alan yoksa migrasyon bu değeri kullanır.
- Bakım devri özetine saatli gece uyanmalarının son 7 gündeki yanıt türü sayılarını da ekler; bu dağılım yalnızca kaydedilen aile gözlemleridir ve beslenme ya da uyku planı önermez.
- `careInstructions`: Ailenin bakım verene bırakmak istediği notları cihazda saklar; yalnızca bakım veren paylaşımı açıkça başlatıldığında devir özetine ekler. Yedeklerde taşınır ve eski veriler boş notla açılır.

### Veri katmanı

Durum `uykuva.db` dosyasında tutulur. Profil, tercih ve uyku planı JSON olarak `app_state` satırında saklanır; bakım kayıtları `care_events`, aşı/randevu gibi bakım görevleri ise `care_tasks` tablosundadır. Bu tablolar kimlik, tür ve sorgulamada kullanılan tarih alanlarını ayrı sütunlarda tutar; geri kalan ayrıntılar JSON yükünde korunur. `saveState` ilgili tabloları ve durum satırını aynı SQLite işlemi içinde günceller. Eski durum JSON'unda gömülü görevler ilk okumada tabloya taşınır.

İlk açılışta depolama göçü eski `ExpoSQLiteStorage` anahtar deposundaki `uykuva:state:v3` / v2 veya önceki `uykvua:state:v1` AsyncStorage kaydını okur; durum ve olayları yeni veritabanına yazdıktan sonra eski anahtarları temizler. Göç tamamlanamazsa kayıt kurtarma ekranı yeniden deneme sunar; uygulama boş başlangıç durumunu eski verinin üzerine yazmaz.

JSON dışa aktarımı, `app_state` ile `care_events` satırlarını tam `AppState` olarak birleştirir. Böylece yedek şeması uygulama içi SQLite tablolarından bağımsız kalır.

Anı fotoğrafları ayrıca dosya yoluna bağlı kalmamak için JPEG veri URI'si olarak anı olayına yazılır. Bu sayede uygulama önbelleği temizlense de fotoğraf bağlantısı kopmaz ve standart/şifreli yedeklerde olayla beraber taşınır. Her görsel 1,1 milyon Base64 karakteriyle, yedek metni 12 milyon karakterle sınırlıdır; içe aktarma MIME türünü ve Base64 biçimini doğrular.

Durum şeması 5 ile `AppState.children` her çocuk için ayrı `ChildProfile` saklar: bebek bilgileri, bakım talimatları, gelişim check-in'leri, bakım kayıtları, görevler ve uyku planı. Uyku planı, bakım verenin sonra bulabilmesi için kaydettiği rehber kimliklerini de çocuk profiline göre tutar. `activeChildId` seçili çalışma alanını belirtir; mevcut ekranlar bu alanın düz değerleriyle çalışır. Her durum değişiminde etkin çocuk anlık görüntüsü güncellenir; profil değiştirirken önce açık çalışma alanı kaydedilir. Bakım verenler ve bildirim tercihleri aile/cihaz genelinde ortaktır. Önceki tek çocuk şemaları tek profilli duruma kayıpsız taşınır; 3 ve 4 numaralı dışa aktarımlarda rehber listesi boş varsayılarak yeni duruma geçirilir. Uyku, rutin, bakım görevi, bez, ilaç ve süt hatırlatmaları bütün çocukların ayrı kayıtlarından yeniden planlanır; bildirim metni ilgili çocuğun adını taşır. JSON yedekleri tüm çocuk profillerini içerir; birleştirme aynı kimlikli çocuğun kayıtlarını bir araya getirir ve diğer profilleri korur.

Aktif çocuk değiştiğinde Bugün ve Uyku planı ekranları yeni profil için yeniden oluşturulur. Kaydedilmemiş saat ve gece özeti taslakları diğer çocuğun ekranına taşınmaz.

İlaç kaydı isteğe bağlı `medicationReminderAt` saatini olayda saklar. `scheduleMedicationReminders` her ilaç adı için en son ilaç kaydını esas alır, eski plan bildirimlerini iptal eder ve yalnızca kullanıcının açıkça girdiği gelecek saat için tek seferlik yerel bildirim kurar. Hatırlatma dozu veya aralığı söylemez; ilaç planını kontrol etmeyi hatırlatır. Bildirim izni yoksa doz kaydı yine tutulur, hatırlatma kurulmadığı açıklanır. İçe aktarılan hatırlatma tarihleri JSON doğrulamasından geçer; profil/veri sıfırlanınca zamanlanmış ilaç bildirimleri iptal edilir.

Uyku bildirimi, bakım vereni tahmini pencere öncesinde haberdar eder ve sessiz saatleri gözetir. Uyku sayacı çalışırken önceden kurulmuş uyku hatırlatmaları iptal edilir; sayaç durunca yeni tahmin için yeniden planlanır.

Aşı ve randevu hatırlatma tercihi görev saatinden 15, 30, 60, 120, 180 veya 1440 dakika öncesini seçer. Sessiz saate denk gelen hatırlatma sessiz dönem bitimine taşınır; görev saatinden sonraya düşecekse atlanır. Seçenekler yedek doğrulamasında da izin verilen dakika kümesiyle sınırlandırılır; eski yedeklerin 120 dakika varsayılanı korunur.

Bildirim türü ve çocuk kimliği her yerel hatırlatmanın `content.data` alanında taşınır. Kullanıcı bildirime dokunduğunda `notificationDestination` güvenilir türleri doğrulayıp Bugün, Akış veya Özet sekmesine yönlendirir; bakım görevi/ilaç/süt bildirimi eşleşen kaydı açabilir. Çocuk kimliği varsa etkin çocuk değiştirilir. Soğuk başlangıçtaki son yanıt ve uygulama açıkken gelen yanıt aynı yönlendirme yolunu kullanır; bilinmeyen türler yok sayılır ve işlenen son yanıt temizlenir.

Yedekleme akışı `createDataExport` ile cihaz verisini biçim etiketi ve şema sürümü taşıyan JSON'a dönüştürür. `parseDataExport` boyutu, biçimi ve çocuk başına profil/kayıt yapılarını doğrular; `migrateState` veriyi geçerli şemaya dönüştürür. İçe aktarmada `expo-document-picker` dosyayı seçer; içerik mevcut JSON doğrulama ve kullanıcı onayı akışına girer. Kullanıcı çocuk profillerinin kayıtlarını birleştirebilir veya tüm cihaz verisini yedekle değiştirebilir. `mergeDataStates` aynı kimlikli çocuğun doğum tarihi ve gebelik haftasının tutarlı olmasını doğrular; eşleşen çocukların kayıtlarını birleştirip yalnızca yedekte bulunan profilleri de ekler. Aynı kimlikli olay ve görevleri yinelenmeden birleştirir; bitmiş uyku kaydını ve tamamlanmış görevi eski açık kayıtla geriye almaz. Check-in'lerdeki farklı alanları ve gece uyanma günlüklerini korur; cihaz tercihlerini mevcut cihazda bırakır. Metin yapıştırma seçeneği de korunur. Aile ekranındaki tek seferlik cihaz aktarımı aynı JSON dosyasını paylaşır; otomatik cihaz senkronizasyonu sağlamaz. Yedekler otomatik olarak sunucuya gönderilmez.

Varsayılan dışa aktarım `createEncryptedDataExport` ile parola korumalı zarfa dönüştürülür: PBKDF2-HMAC-SHA256, 600.000 iterasyon ve 16 bayt rastgele tuzdan 256 bit anahtar türetir; AES-256-GCM, 12 bayt nonce ve 16 bayt doğrulama etiketi kullanır. Dosya biçim sürümü ve kripto parametreleri doğrulanır; KDF iterasyonu sabit tutulur, böylece sahte dosya yüksek hesaplama yükü oluşturamaz. `decryptDataExport` doğrulanmış metni mevcut `parseDataExport` akışına verir. En az 12 karakterli parola dışa aktarımda iki kez istenir; parola cihazda saklanmaz ve unutulursa geri getirilemez. Şifresiz JSON seçeneği ayrı uyarı onayıyla korunur. Profil silme, şifreli ve şifresiz Uykuva yedeklerinin uygulama önbelleğindeki kopyalarını da temizler.

Kullanıcı tüm cihaz verisini silmeyi onayladığında `cancelAllCareReminders`, bekleyen ve bildirim merkezinde gösterilmiş tüm uygulama bildirimlerini kaldırmayı dener. Önbellekteki `uykuva-yedek-YYYY-AA-GG.json` dosyaları da silinir; ardından `resetState` SQLite olay, görev ve profil tablolarını temizler. Bildirim veya yedek dosyası temizliği başarısız olsa bile veri silme sürer ve sonuç ekranı kalan öğeleri açıkça bildirir.

Sağım kayıtları beslenme tüketimlerinden ayrı tutulur. `src/domain/milk.ts` sağılan süt partilerini saklama türüne göre son kullanım tarihleriyle hesaplar; sağılan süt biberonları en eski uygun partiden düşer. Tamamen çözüldü olarak işaretlenen süt için 24 saatlik, ısıtılan veya oda sıcaklığına gelen süt için iki saatlik kullanım süresi başlatılır. Depolama aralıkları CDC rehberine dayalıdır ve uygulama stok uyarısını tıbbi talimat olarak sunmaz.

Sağılan süt hatırlatması tercihi varsayılan olarak kapalıdır. Açıldığında `scheduleMilkExpiryReminders`, kullanılabilir süt partilerini son kullanım saatine göre sıralar ve en yakın 12 parti için tek seferlik yerel bildirimler planlar. Kullanıcı otomatik zamanlamayı veya son kullanımdan 2, 6, 12, 24 ya da 48 saat öncesini seçebilir; seçilen süre partinin kalan süresinden uzunsa, bildirim kalan sürenin yaklaşık yarısına alınır. Otomatik seçenek önceki uyarlamalı zamanlamayı korur. Dondurulmuş süt çözülmemişse altı aylık en iyi kalite önerisine ayrı bir hatırlatma kurar; bu tarihi geçmek partiyi otomatik olarak geçersiz yapmaz. Ayrıca 12 aylık tavsiye edilen son kullanım tarihi yaklaşırken ayrı hatırlatma kurar. Diğer saklama biçimlerinde yalnızca hesaplanan kullanım sonu hatırlatılır. Sessiz saatlere denk gelen bildirim, ilgili tarihten önceki uygun sessiz saat bitişine taşınır. Kullanımı bitmiş, süresi geçmiş veya stokta kalmamış partiler için bildirim kurulmaz. Yeni tercih eski verilerde ve yedeklerde `adaptive` varsayılanıyla geriye uyumlu çalışır; JSON aktarımında değer doğrulanır.

Katı gıda günlüğü, `src/domain/solids.ts` içinde kaydedilen yiyecek adlarını, ilk uygulama kayıt tarihini, öğün sayısını ve seçilen alerjen etiketlerini özetler. Tepki gözlemleri öğün notuyla birlikte tarih sırasıyla gösterilir; etiketlerden veya notlardan alerji durumu çıkarılmaz.

Uyku koçluğu günü yerel takvim gününde en fazla bir kez ilerler. `SleepPlan.lastAdvancedDate` bu günü saklar; ilerletilen her gün `completedDays` geçmişine tarih, yaklaşım, odak ve tamamlanan/toplam görev sayısını yazar. Gün 14'e ulaştığında son gün ayrıca tamamlanır ve `completedDate` kaydedilir. Arayüz son yedi plan gününün görev sayılarını gösterir ve aynı gün tekrar ilerlemeyi engeller. Aynı yaklaşım/odakta altı plan günü tamamlandığında ilk üç ve son üç günün check-in kolaylık ortalaması ile açıkça sayılmış (0–4) gece uyanmalarını karşılaştırır; 5+ kayıtları sayı üst sınırı nedeniyle uyanma ortalamasından çıkarır. Eski yedeklerde geçmiş yoksa boş listeye geçiş yapılır; içe aktarılan geçmiş tarih, yöntem, odak ve sayım doğrulamasından geçer.

Uyku planı duraklatma durumu `SleepPlan.paused` alanında saklanır. Duraklatılmış planda günlük koçluk adımları etkileşime kapanır ve gün ilerlemez; bakım kayıtları ile rutin çalıştırıcısı kullanılmaya devam eder. Migrasyon eski verilerde bu alanı `false` yapar; JSON yedek doğrulaması alan yoksa eski yedekleri kabul eder.

Akşam rutini adımları ebeveyn tarafından etkinleştirilip devre dışı bırakılabilir, süreleriyle birlikte saklanır ve uygulama içi yukarı/aşağı kontrolleriyle sıralanır. Rutin çalıştırıcısı bu sırayı kullanarak tamamlanma özetini zaman çizelgesine yazar.

Akşam rutini bildirimi isteğe bağlıdır. Etkin rutin adımlarının toplam süresi hedef yatış saatinden çıkarılır; sonraki yedi günün bildirimleri yerel olarak kurulur. Süre sıfırsa veya bildirim sessiz saatlere denk gelirse o gün bildirim planlanmaz. Eski yedeklerde bu tercih varsayılan olarak kapalıdır.

Anı günlüğü, `memory` türünde zaman çizelgesi olayı olarak saklanır. Önerilen başlıklar yalnızca hızlı giriş içindir. `detectRecordedMilestones`, ilk uyku/beslenme/ek gıda/ölçüm kayıtlarını, ilk dört saatlik uyku kaydını ve 100. beslenme kaydını yalnızca mevcut olaylardan bulur; gelişim basamağı veya klinik değerlendirme çıkarmaz. Ebeveyn isterse bulunan anı tek dokunuşla günlüğe ekler. `milestoneId` tekrar öneriyi önler ve JSON yedeğinde korunur. Insights ekranındaki anı defteri, geçmişteki anı kayıtlarını tarihe göre sıralayıp PDF’e dönüştürür; HTML metinleri kaçırır, yalnızca doğrulanmış JPEG veri adreslerini gömer ve gelecekteki kayıtları dışarıda bırakır. Fotoğraf toplamı sekiz görsel ve yaklaşık 6 MB ile sınırlıdır; eklenmeyen görsel sayısı PDF’de belirtilir. PDF `expo-print` ile cihazda hazırlanır ve `expo-sharing` üzerinden kullanıcının seçtiği hedefe gönderilir; sunucuya yükleme yapılmaz.

Doktor özeti, ebeveynin seçtiği son 7, 14 veya 30 günlük aralıkta beslenme, bez, sağlık, uyku ve saatli uyanma kayıtlarını kapsar; ileri tarihli veya bozuk olay saatleri sayılmaz. PDF ve metin aynı aralık parametresini kullanır. Büyüme bölümünde olay sıralamasından bağımsız olarak en yeni geçmiş ölçüm seçilir. Gelişim bölümünde ileri tarihli gözlem dışarıda kalır. Bu rapor kullanıcı kayıtlarını düzenler; klinik değerlendirme üretmez.

Son yedi günlük uyku özeti, yerel takvim günlerine göre uyku dakikalarını çakışmaları tek kez sayarak listeler; gece uykusunu günlere dağıtır. Aynı satıra varsa ebeveynin gece uyanma sayısı, kolaylık puanı, yatış/uyanış saati ve olağan dışı gün bağlamı eklenir. Kayıt olmayan günler açıkça gösterilir; bugünkü günün tamamlanmadığı belirtilir. PDF yalnızca kullanıcının cihazında oluşturulur.
Gelişim gözlem kartı `src/data/developmentMilestones.ts` içindeki CDC 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48 ve 60 aylık listeleri kullanır. Yaş seçimi, erken doğumda ilk iki yıl için düzeltilmiş doğum tarihini takvim ayıyla karşılaştırır; iki liste yaşı arasındaysa daha küçük yaş listesini gösterir. Çocuğun mevcut yaşına kadar olan eski listeler seçilip gözden geçirilebilir. Yanıtlar, notlar ve kontrol tarihi `developmentCheckIns` alanında yerel olarak saklanır, JSON yedeğine eklenir ve kullanıcı doktor özetini paylaştığında son kontrolün özeti de paylaşılır. Bu liste gelişim tarama aracı veya tanı değildir.

Büyüme geçmişi son sekiz kilo/boy/baş çevresi ölçümünü tarihle gösterir. İsteğe bağlı WHO eğrisi seçimiyle `src/domain/whoGrowth.ts`, WHO Anthro'nun resmî deposundaki günlük LMS tablolarından (0–1826 gün) z-skoru ve persentil hesaplar; küçük grafikler P10/P50/P90 referans çizgileri ve ölçüm noktalarını gösterir. Boy ölçümünde yatış/ayakta bilgisi saklanır ve yaşa uymayan ölçüm konumunda WHO'nun 0,7 cm düzeltmesi uygulanır. WHO verileri `src/data/{weianthro,lenanthro,hcanthro}.json` dosyalarında tutulur. Kaynak: [WHO Anthro büyüme standartları hesaplama deposu](https://github.com/WorldHealthOrganization/anthro). Eğriler bilgilendirme amaçlıdır; tıbbi yorum veya tanı oluşturmaz.

Bez özeti, `src/domain/diapers.ts` içinde son yedi yerel takvim günündeki ıslak, kirli ve ikili kayıt sayılarını ayrı toplar. Eksik bez kayıtlarını tahmin etmez; dağılım yalnızca takip kolaylığı içindir ve sağlık değerlendirmesi değildir.

Gece uyanması rehberi yaş aşamasına göre ayrılır: yeni doğanda destek ve ihtiyaçlara yanıt, hazırlık döneminde tutarlı rutin, hazır oluş koşulları tamamlandığında ise seçili yaklaşımın adımları gösterilir. Beslenme ihtiyacını ertelemeyi veya ağlamayı görmezden gelmeyi önermeyen kısa yol gösterimi sunar. Güvenli uyku metni bebeği her uykuda sırtüstü, sert ve düz ayrı bir yüzeye yatırmayı; ilk 6 ay aynı odada ayrı uyku alanı kullanmayı; yastık, yorgan, oyuncak ve gevşek örtüleri uzak tutmayı; başını örtmemeyi, aşırı sıcak tutmamayı ve yetişkin yatağını paylaşmamayı belirtir. Öneriler [AAP HealthyChildren](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx) ve [CDC güvenli uyku rehberine](https://www.cdc.gov/sudden-infant-death/sleep-safely/index.html) bağlanır. Bebeğin farklı bireysel ihtiyaçları için metin klinik değerlendirme yerine geçmez.

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

Uyku planı yedi aile merkezli yaklaşım sunar. Altı aydan küçük düzeltilmiş yaşta veya dört hazırlık maddesi tamamlanmadan yöntem seçimi açılmaz; bu aşamalarda duyarlı bakım ve rutin rehberi gösterilir:

- **Duyarlı rutin:** Huzursuzluğa hızlı yanıt ve tutarlı uyku öncesi sıra.
- **Kademeli destek:** Bakım yardımını küçük adımlarla azaltma.
- **Önceden kararlaştırılmış kısa kontroller:** Bakım verenlerin seçtiği kısa kontrol düzeni; uygulama sabit süre veya ağlama aralığı önermez.
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
- [x] 14 günlük uyku eğitimi/alışkanlık planı ve tamamlanan döngü arşivi eklendi; tüm döngüler başlangıç/bitiş tarihleri, günlük görev toplamları ve yöntem bilgisiyle saklanır.
- [x] Yedi uyku yaklaşımı; yönteme özel gece rehberi, gün adımları, yedek doğrulaması ve eski yöntem migrasyonu eklendi. Süreli kontrol yaklaşımı sabit aralık veya ağlama süresi önermiyor; bebeğin ihtiyaçları ve bakım verenin kararı öncelikli.
- [x] Hazır oluş koşulları tamamlandığında yedi yaklaşım; yöntem özeti, bakım veren adımı, gece yanıtı, beklenen huzursuzluk, yakınlık, uygulama yükü ve ilerleme biçimiyle karşılaştırılıyor. Ailenin yakınlık, destek azaltma veya kısa kontrol tercihine göre filtreleniyor; tüm yöntemler erişilebilir kalıyor.
- [x] Ailece belirlenen kısa kontroller yaklaşımı eklendi. Uygulama sabit aralık veya ağlama süresi önermiyor; beslenme, sağlık ve yoğun huzursuzlukta gecikmeden yanıt veriliyor.
- [x] Koçluk gün geçmişi, hazır oluş koşulları değişince kullanıcıya gösterilen etkin yaklaşımı kaydeder; check-in karşılaştırması aynı yaklaşım ve odağa göre yapılır.
- [x] Uyku planında yatma zamanı, gece uyanmaları, gündüz uykuları veya akşam rutini odağı seçilip günlük rehber buna göre uyarlanabiliyor.
- [x] Plan günü ilerletildiğinde yaklaşım/odak ve tamamlanan görev sayısı 14 günlük geçmişte korunuyor.
- [x] Bakım verenlerle paylaşılan uyku planı, seçilen yaklaşımın özeti, özellikleri ile bakım veren ve gece uyanması yönergelerini; son 7 gecenin check-in ölçümlerini/notlarını ve varsa ilk/son dönem karşılaştırmasını içeriyor.
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
- [x] Son emzirme kaydındaki zamanlı taraf oturumuna göre sıradaki taraf önerisi eklendi.
- [x] Biberon miktarı ve katı gıda/tepki kaydı eklendi.
- [x] Katı öğünlerden ayrı, son 30 günlük süt beslenmesi aralığı tahmini eklendi; yeterli örnek yoksa gereken kayıt sayısı açıklanır.
- [x] Günlük emzirme süresi, biberon ve katı öğün toplamları eklendi.
- [x] Gerçek gece başlangıçlarını hedef yatışla karşılaştıran koçluk içgörüsü eklendi.
- [x] Gecelik değişimi 15 dakika ile sınırlayan yatış önerisi eklendi.
- [x] Düzenlenebilir hedef yatış ve sabah saatleri eklendi.
- [x] Açılıp kapatılabilen, ekleme ve silme destekli kişisel akşam rutini eklendi.
- [x] Aynı cihazda ebeveyn, aile üyesi ve bakıcı profilleri eklendi.
- [x] Aktif bakım veren değiştirme ve seçilen kişi adına kayıt ekleme eklendi.
- [x] Bakım veren rol seçimi, kaldırma ve eski veri migrasyonu eklendi.
- [x] Yedi günlük doktor özeti A4 PDF dosyası olarak oluşturulup paylaşılabiliyor.
- [x] Son yedi günlük uyku süresi, check-in ve plan durumu A4 PDF raporu olarak hazırlanıp paylaşılabiliyor; eksik günler ve kısmi bugünkü gün belirtiliyor.
- [x] Uyku koçu planı, son yedi gecenin check-in'leriyle metin veya A4 PDF olarak bakım verenlerle paylaşılabiliyor.
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
- [x] 12 saati aşan açık uyku sayacı uygulama açıkken nazik onayla veya bildirimler açıksa sessiz saat sonrasına ertelenen yerel hatırlatmayla kontrol edilir. Bildirimin ana gövdesi ilgili uyku kaydını düzenlemeye açar; “Uyandı · şimdi kaydet” eylemi yalnızca hedef kayıt hâlâ açıksa eylemin yapıldığı anı bitiş saati olarak kaydeder. Eylem, kullanıcı onayı olmadan sayacı kapatmaz ve eski/kapalı kayıtları değiştirmez.
- [x] 9 haftadan küçük bebeklerde uyku, beslenme, bez ve sağlık özeti takvim günü yerine son 24 saati kapsar.
- [x] Tahmin aralığı geçtikten sonra kaydı olmayan bakım verene bir kez sorar ve gözden geçirilebilir tarihli kayıt açar.
- [x] Uyku tahmin motoru için birim testleri yazıldı.
- [x] Tüm özellikler ücretsiz bırakıldı; ödeme sistemi eklenmedi.
- [x] Kayıtlardaki uyku, emzirme, biberon, ek gıda, süt sağma, bez, sağlık ve büyüme olaylarından 13 olgusal anı önerisi çıkarılıyor; ebeveyn seçerse anı günlüğüne ekleniyor.
- [x] Sabah check-in'i önceki gece gerçekte uygulanan yaklaşımı isteğe bağlı kaydeder; açıkça farklı yaklaşım belirtilmiş geceler plan karşılaştırmasından çıkarılır.
- [x] Yaklaşımın aileye uyum puanı ve günlük yönteme özel koçluk sorusuna yanıt isteğe bağlı kaydedilir; aileye uyum ilk/son plan döneminde ayrı gösterilir.
- [x] Uyku planında eksik günlük adımlar açıkça gösterilir; ebeveyn tüm görevleri bitirmeden günü kaydedip ilerleyebilir.
- [x] Son yedi günün ıslak, kirli ve ikili bez kayıtları ayrı trend grafiğinde gösteriliyor.

## 10. Uyku koçluğu kapsamı ve kalan işler

Whispie'nin resmî ürün sayfası yaş aralığını kişisel uyanıklık kayıtlarıyla ayarlayan uyku tahminini, kısa bir sonraki-uyku penceresini ve 6 aydan itibaren Sleep Coach'u tanıtıyor ([özellik sayfası](https://www.whispieapp.com/whispie/), [tahmin yöntemi](https://www.whispieapp.com/whispie/how-it-works/)). 21 Ekim 2026 tarihli açıklaması altı gün diliminde son 10 uyanıklık aralığını, gündüzde en az 5 ve gece diliminde en az 2 örnek eşiğini tarif ediyor. Kişisel uyku saatleri ilk üç etkin günden sonra Premium'a, altı yöntemli koç ise Premium+ üyeliğine bağlı. Whispie ayrıca yaşa göre düzenlenmiş 79 kısa rehber, 36 dil, 39 ülkenin aşı takvimi ve ücretsiz planda iki aile üyesi sunuyor. Uykuva'da kişisel uyku tahminleri, yedi yöntemli 14 günlük koçluk, çok dilli ekranlar ve ülkeye göre aşı takvimi ücret olmadan sunulacak şekilde tasarlanıyor; bu uygulamada abonelik veya ücretli kapı yok.

Uykuva'nın hesaplama motoru da altı gün dilimini, son 10 örneği ve gündüz/gece için 5/2 örnek eşiğini kullanıyor; yaş aralığına kişisel örüntüyü harmanlıyor ve geçmiş tahmin hatalarına göre pencereyi ayarlıyor. Uyku koçluğunda yedi yaklaşım, yaşa bağlı hazır oluş kapısı, 14 günlük rehber, gece uyanması rehberi, sabah check-in'i, duraklatma ve tamamlanan program arşivi var.

Koç ekranındaki kısa uyku rehberi temel bilgilendirmeyi çevrimdışı sunar: bebeklerin uyku ritmindeki değişkenlik, sakin ve tekrarlanabilir rutin, gece uyanınca ihtiyacı değerlendirme, bebeklerde güvenli uyku, bakım verenlerin ortak bir yanıt belirlemesi ve zor günlerde planı erteleme. Yaş aşamasında destek azaltma kapalıysa rehber bunu da açıklar; hazır oluş maddeleri tamamlandığında yöntem karşılaştırmasına geçiş verir. Ayrıntılı okuma için NHS'in [bebek uykusu rehberine](https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/), AAP'nin [bebek uyku rehberine](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx) ve CDC'nin [güvenli uyku bilgilerine](https://www.cdc.gov/sudden-infant-death/sleep-safely/) bağlantı verilir. Temel kart içerikleri 27 Ekim 2026'da bu kaynaklar gözden geçirilerek yazıldı; sağlık tavsiyesi yerine geçmez ve uyku eğitiminin aile için zorunlu olmadığını açıkça söyler.

Uyku sekmesinde ayrıca `src/data/sleepGuides.ts` tarafından sağlanan on altı çevrimdışı kısa okuma bulunur: yaklaşık dört ay civarındaki uyku döngüsü değişimi, gece-gündüz işaretleri, sakin akşam rutini, uykuya geçiş desteğini değiştirme seçenekleri, gece uyanmaları ve ayrılık kaygısının gece uykusuna etkisi, hastalık/diş çıkarma/düzen değişikliği ve bakım veren desteği ile gündüz uykusu geçişleri ve güvenli uyku alanı; araba koltuğu, puset, salıncak veya taşıyıcıda uyuyakalan bebeği mümkün olan en kısa sürede düz uyku yüzeyine alma bilgisini ve dönme işareti başlar başlamaz sarmayı bırakma, ağırlıklı kundak kullanmama uyarılarını içerir. Küçük çocuklarda yatmaya direnme ve yatmadan önce ekranları kapatma da ele alınır. Konu filtreleri temel bilgiler, gece uyanmaları, rutin, beslenme, zor günler, bakım veren ve gündüz uykuları başlıklarına göre gösterimi daraltır. Her okuma çocuk profiline özel olarak kaydedilip Kaydedilenler filtresinde bulunabilir; kayıtlar cihaz verisine ve yedeklere dahildir. Rehberler işletim sisteminin paylaşım menüsüyle bakım verenlere iletilebilir. Yeni okumalar gece beslenmesinin uyku planından ayrı olduğunu ve değişen günlerde plana ara verilebileceğini açıklar. Her özet kendi NHS, AAP veya Queensland çocuk sağlığı kaynağı bağlantısını taşır ve tıbbi danışmanlık olmadığını açıklar. Dört ay civarındaki değişim, uyku eğitimi için hazır olma veya başlama önerisi olarak sunulmaz. Gündüz uykusu geçişi metni yaş aralıklarını zorunlu hedef gibi sunmaz. Zor günler rehberi, uygulamadaki gün bağlamı seçimiyle koçluk adımlarını bekletmeyi, günlük bakım kayıtlarını sürdürmeyi açıklar. İçerikler son olarak 30 Ekim 2026'da gözden geçirilmiştir.

Uyku planındaki dört hazır oluş maddesinin her birinde etkileşimli kutu ve kısa açıklama bulunur. Açıklamalar hastalık/ağrı olduğunda planı bekletmeyi, beslenme endişesinde çocuk doktoruna danışmayı ve beslenmeyi geciktirmemeyi, güvenli uyku düzenini değiştirmemeyi ve bakım verenler ortak karar veremiyorsa destek azaltmayı ertelemeyi belirtir. Açıklamalar hazır oluş kontrolünün tıbbi değerlendirme olmadığını korur. Yöntem karşılaştırma kartları ekran okuyucuya seçili yaklaşım durumunu ve seçim eyleminin sonucunu bildirir.

Uyku rehberi, solunum güçlüğü veya uzun/tekrarlayan nefes duraklamaları, sık/yüksek sesli horlama ve olağandışı uykuya meyil fark edilirse çocuk doktoruyla görüşmeyi; nefes alamama, renk değişikliği ya da zor uyandırılma durumunda acil yardım almayı söyler. Bu belirtilerde uyku planını uygulamaya devam etmemeyi belirtir. Kaynaklar AAP'nin [uyku apnesi belirtileri](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Sleep-Apnea-Detection.aspx) ve NHS'in [acil yardım işaretleri](https://www.nhs.uk/baby/health/when-to-get-urgent-medical-help-for-babies-and-children-under-5/) sayfalarıdır. Bu kısa yönlendirme tanı koymaz ve profesyonel değerlendirmeyi ikame etmez.

Güncel ürün farkları: Whispie'nin resmî sayfası 36 dili, 39 ülkede aşı takvimini ve ücretsiz hesapta iki aile üyesini listeliyor. Uykuva şu an Türkçe ve Türkiye takvimine odaklı; aynı cihazda ayrı bakım veren profilleri, paylaşılabilir devir/plan özeti ve dosya tabanlı yedek taşıma sunuyor. Hesaplar arası eşitleme istemcisi, aile daveti, roller, cihazda AES-GCM şifreleme, elle eşitleme ve bulut kopyasını kullanıcı denetiminde silme akışları eklendi; yerel migration ve 17 RLS testi geçti; barındırılan Supabase yapılandırması ve iki cihazlı doğrulama bekliyor. Ülkeye göre aşı takvimi ve ek ekran dilleri hâlâ yok. Eşitleme durum ayrıntıları [SYNC_DESIGN.md](SYNC_DESIGN.md) dosyasındadır.

Uyku koçluğu ve tahminler ebeveynin gözlemlerinin yerine geçmez. Mevcut yaş sınırları, hazır oluş maddeleri, hastalık/seyahat duraklatması ve sağlık uzmanına yönlendirme metinleri korunmalıdır.

Randevular tek seferlik, haftalık veya aylık olarak ayarlanabilir. Tekrarlanan sonraki randevu, mevcut kayıt tamamlandığında oluşturulur; geçmişteki tamamlanmış kayıt silinmez. Aşı kayıtları tekrarlama seçeneği almaz. Bildirim tercihi açıksa sıradaki örnek mevcut randevu hatırlatma zamanlamasına girer.

Gece modu girişinde ekran okuyucu etiketi ve eylem ipucu bulunur. Alt gezinme hedefleri sekme rolü ve seçili durumunu ekran okuyucuya aktarır; koçluk ilerleme şeridi tek bir tamamlanan gün özeti olarak okunur. Gece modu giriş/çıkış hedefleri en az 48 dp, uyku/beslenme/bez hızlı eylemleri en az 88 dp, ortak seçim etiketleri en az 48 dp yüksekliğindedir. Rutin sıralama, kayıt silme, uyku değerlendirme ve gelişim dönüm noktası seçimlerinin dokunma hedefleri de en az 48 dp'dir. Metinler sistemin varsayılan yazı ölçeklendirmesini kullanır; bu düzenleme tam erişilebilirlik denetiminin yerini almaz.

Uyku koçu son üç geçerli yerel gün içinde kolaylık, uyanma sayısı veya saatli gece uyanması içeren check-in'leri inceler. Takvimde olmayan tarihler ve yalnızca saat ya da not içeren kayıtlar rehbere katılmaz. 5+ uyanma veya tekrarlayan zor gecelerde daha fazla destek ve temel ihtiyaç kontrolü önerir; daha kolay gecelerde mevcut rutini korumayı söyler. Belirli bir saatli uyanma yanıtı son 72 saatte en az iki kez kaydedilmişse, nedeni yorumlamadan bu bilgiyi bakım devrinde konuşmayı önerir. Gelecek saatler ve yinelenen kayıt kimlikleri sayılmaz. Bu rehber plan yöntemini otomatik değiştirmez, beslenmeyi ertelemez ve uyku başarısı/sağlık sonucu iddiasında bulunmaz.

- [x] Bakım olaylarını ayrı `care_events` SQLite tablosuna taşıma; eski SQLite KV ve AsyncStorage durum anahtarlarından güvenli ilk açılış göçü
- [x] Bakım görevlerini indeksli `care_tasks` SQLite tablosuna taşıma; gömülü eski görevleri ilk okumada kayıpsız aktarma
- [ ] Diğer büyüyen veri kümelerini normalize tablolara ayırma
- [x] İsteğe bağlı hesap ve elle eşitleme istemcisi; yerel migration ve pgTAP doğrulandı; barındırılan proje ve iki cihazlı gerçek eşitleme bekliyor.
- [x] Süreli aile daveti, aile sahibi izinleri, salt okunur rolü, davet iptali ve bulut aile verisini silme istemcisi; yerel Supabase üzerinde 17 pgTAP RLS testi geçti; barındırılan veritabanında RLS henüz çalıştırılmadı.
- [x] Randevular için haftalık/aylık tekrar; tamamlanan her örnekten sonra sıradaki örnek açılır ve geçmiş kayıt saklanır.
- [x] Aşı ve randevular bakım veren profiline atanabilir; görev kartı ve devir özeti sorumluyu gösterir, yinelenen randevu atamayı korur ve atanan kişi silinince görev ataması temizlenir.
- [x] Ayrı uyku penceresi, olası uyanış, akşam rutini, bakım görevi, bez ve süt saklama hatırlatmaları; olay türüne göre süre seçimi ve gece sessiz saatleri
- [x] Android ana ekran uyku widget'ı eklendi; Android dışındaki widget/Live Activity desteği açık
- [x] Tamamlanan 14 günlük uyku planı döngülerinin tamamı, başlangıç/bitiş tarihleri ve görev geçmişiyle saklanır, birleştirilebilir ve koç ekranında listelenir.
- [x] WHO 0–5 yaş kilo, boy ve baş çevresi z-skor tablolarıyla persentil eğrileri; kız/erkek eğrisi profilde isteğe bağlı seçilir
- [x] Aşı önerisinde kaynak sürümü, resmi duyuru bağlantısı ve 49–72 ay suçiçeği yakalama dönemi için hekimle teyit uyarısı gösteriliyor.
- [ ] Aşı kartı/e-Nabızdan doğrulanan doz geçmişiyle kişiye özel, hekim onaylı eksik doz akışı
- [x] Ek gıda/alerjen etiket geçmişi ve gözlem notlarının Özet ekranında listelenmesi; tıbbi yorum yapılmaması
- [x] Sesli Türkçe kayıt: bakım notu, sağlık notu ve anı ayrıntısı için yerel model önceliği, açık mikrofon izni ve ağ tabanlı sistem tanımasına geçişte bilgilendirme
- [x] İkiz ve çoklu çocuk profilleri; yerel kayıt ayrımı, profil geçişi ve çok profilli yedek
- [x] Önemli gezinme, form, seçim ve eylemlerde ekran okuyucu etiketleri/durumları; sistem yazı ölçeğini izleyen metinler
- [ ] Gerçek Android/iOS cihazlarda ekran okuyucu ve büyük yazı ölçeği erişilebilirlik denetimi
- [x] Şifreli ve JSON yedek dışa aktarma, yedekten geri yükleme, yerel veriyi silme ve isteğe bağlı bulut eşitlemesi için açık onay
- [ ] Bulut sağlayıcısı ve aktarım koşulları kesinleşince uzman incelemeli KVKK aydınlatma/açık rıza metinleri ve hesap silme akışı
- [ ] Uzman içerik incelemesi ve klinik kaynak sürümleme
- [ ] Gerçek cihaz, mağaza ve uçtan uca testleri

## 11. Sonraki geliştirme sırası

1. Kullanıcıya ait barındırılan Supabase yapılandırması ve gerçek iki cihazlı eşitleme/çakışma denemesi
2. Bildirim planlarının gerçek cihaz ve saat dilimi değişimlerinde uçtan uca doğrulanması
3. Ebeveynin seçeceği ek ekran dilleri ve ülkeye göre aşı takvimleri
4. İçerik ve uyku planlarının kaynak sürümlemeyle uzman doğrulaması
5. Erişilebilirlik denetimi, gerçek cihaz testleri, kapalı beta ve mağaza hazırlığı

## 12. Güvenlik ve mevzuat notları

- Bebek ve sağlıkla ilişkili kayıtlar hassas veri kabul edilerek tasarlanmalıdır.
- Bulut senkronizasyonu eklenirse aktarımda TLS, depoda şifreleme ve ayrıntılı erişim denetimi zorunludur.
- Üretim analitiğinde olay ayrıntıları, bebek adı, doğum tarihi veya bakım notu bulunmamalıdır.
- Bulut sağlayıcı ve yurt dışı aktarımı seçilmeden önce KVKK aktarım mekanizması belirlenmelidir.
- Yerel cihaz verisini silme ve makinece okunabilir dışa aktarma akışları uygulamada vardır. Bulut sağlayıcısı ve aktarım koşulları kesinleşince aydınlatma metni uzman incelemesinden geçirilmeli; barındırılan hesap sistemi etkinleştirilmeden hesap silme akışı tamamlanmalıdır.
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
- `npm.cmd test`: 38/38 test başarılı
- `npx.cmd expo-doctor`: 20/20 kontrol başarılı
- `npx.cmd expo export --platform android`: Android üretim paketi başarıyla oluşturuldu
- Android `:app:assembleDebug`: başarılı; APK emülatöre kuruldu

30 Ekim 2026'da `npm audit` güvenli `npm audit fix` sonrasında 5 düşük ve 3 yüksek bulgu raporladı. Yüksek bulgular Expo CLI bağımlılık ağacındaki `deepmerge`/`zod` ile ilişkilidir; npm'nin kalanları gidermek için önerdiği `--force` çözümü Expo'yu 51.0.39'a düşürerek SDK 58'den kırıcı geri dönüş yapar, bu yüzden çalıştırılmadı. `node-forge` yüksek bulgusu uyumlu güncellemeyle giderildi. Kalanlar mağaza build'inden önce yeniden değerlendirilmeli.

### 30 Ekim 2026 yerel doğrulaması

- `npm.cmd run typecheck`: başarılı.
- `npm.cmd test`: 98/98 test başarılı.
- `npx.cmd expo run:android --no-bundler --device emulator-5554`: native Android build başarılı; `expo-secure-store` derlemeye dahil edildi ve APK emülatöre yüklendi.
- Emülatörde uygulamanın açılışında Bugün ana ekranı görüntülendi; Gece uyanması formu yalnızca kısayola dokunulduğunda açıldı.
- Android SDK yolu gitignore kapsamındaki yerel `android/local.properties` dosyasında ayarlandı.
- `npm.cmd run db:start`: yerel Supabase yığını başladı ve Postgres 17 migration'ı uygulandı.
- `npm.cmd run db:test`: 17/17 pgTAP aile/RLS testi başarılı.
- `npm.cmd exec -- supabase db lint --local`: şema hatası yok.
- `npm.cmd audit fix`: Expo 58.0.21 ve uyumlu transitif patch'ler yüklendi; `node-forge` yüksek bulgusu giderildi.
- Güncelleme sonrası `npm.cmd run typecheck`: başarılı; `npm.cmd test`: 98/98 başarılı.
- Güncelleme sonrası Android native build başarılı; emülatör Bugün ana ekranını açtı ve SecureStore kırmızı ekranı görünmedi.

### 30 Ekim 2026 açılış ve güncel test doğrulaması

- `npm.cmd run typecheck`: başarılı.
- `npm.cmd test`: 116/116 test başarılı.
- Android emülatöründe uygulama soğuk başlatıldı; başlangıçta Bugün ana ekranı açıldı. Gece uyanması formu yalnızca Bugün veya gece modu kısayolu seçildiğinde açılıyor.

### 30 Ekim 2026 haftalık uyku planı paylaşımı

- Uyku koçluğu paylaşımı seçilen yönteme, yaş aşamasına ve odak alanına göre kalan plandan en fazla yedi günü metin/PDF içine ekler; 14 günlük sınırda durur.
- Olağan dışı gün işaretliyken o günün görevleri paylaşımda etkin gösterilmez; plan günü atlandığı belirtilir. Plan elle duraklatılmış veya bitmişse yeni görev listelenmez.
- `npm.cmd run typecheck`: başarılı.
- `npm.cmd test`: 118/118 test başarılı.
- Android emülatöründe `PDF hazırla` düğmesi çalıştırıldı; PDF üretildi ve Android paylaşım menüsü açıldı. Dosya adı tarih/saat içeren `uykuva-uyku-plani-…pdf` biçiminde göründü.

### 30 Ekim 2026 eşitleme silme koruması

- `AppState` şema sürümü 6, olay, bakım görevi, gece uyanması, çocuk ve bakım veren silme kimliklerini kalıcı `syncTombstones` listelerinde taşır.
- Veri silme ve check-in güncelleme bu işaretleri yazar; yedek dışa aktarma/geri yükleme bunları korur.
- Birleştirme iki tarafın işaretlerini birleştirip eski kayıtları filtreler; silinmiş çocuk veya bakım veren referansları geri eklenmez.
- Aynı aile belgesine başka cihaz yazdıysa istemci yeni revizyonu indirip birleştirerek en fazla üç kez yeniden dener; sürekli çakışmada yerel kayıtları koruyup kullanıcıyı yeniden eşitlemeye yönlendirir.
- Bu yerel/yedek birleştirme davranışı test edildi. Barındırılan Supabase kurulumu ve iki cihazda gerçek bulut eşitlemesi henüz doğrulanmadı; silme işaretleri şu an onay sonrası temizlenmiyor.
- Doğrulama: `npm.cmd run typecheck` başarılı; `npm.cmd test` 124/124 başarılı.
