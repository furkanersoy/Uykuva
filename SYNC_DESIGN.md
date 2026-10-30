# Uykuva cihazlar arası eşitleme tasarımı

Durum: İsteğe bağlı istemci temeli eklendi; bulut eşitlemesi varsayılan olarak kapalıdır ve Supabase yapılandırması olmadan çalışmaz.

30 Ekim 2026'da ilk PostgreSQL temel migration'ı, yerel Supabase ayarı ve pgTAP erişim testi yazıldı: `supabase/migrations/20261030120000_family_sync_foundation.sql`, `supabase/config.toml` ve `supabase/tests/family_sync_rls_test.sql`. Migration; aile, üyelik, süreli davet ve şifreli çocuk belgesi tablolarını, davet kabul/iptal, üyeyi/aileyi silme işlevlerini ve revision numarasıyla çakışmayı reddeden yazma işlevini tanımlar. Mobil istemci artık e-posta hesabı, aile/davet işlemleri, SecureStore oturum ve aile anahtarı saklaması, AES-GCM belge şifreleme/çözme ve kullanıcı onaylı elle eşitleme akışlarını içerir. Şema henüz bir Supabase projesine uygulanmamış, pgTAP testi çalıştırılmamıştır; gerçek kullanım için Supabase URL/publishable anahtarı, migration uygulaması ve Android geliştirme derlemesinin yenilenmesi gerekir.

`src/services/cloudSync.ts` yalnızca `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` geçerliyse istemci kurar. `.env.example` değişken adlarını gösterir; gerçek değerler `.env` içinde tutulur ve Git'e eklenmez. Eşitleme Aile ekranında açıkça onaylanıp elle başlatılır; arka planda otomatik yükleme yoktur. Her cihazda aynı aile anahtarı gerekir. Anahtar SecureStore'da saklanır, uygulama sunucusuna yollanmaz ve davet kodundan ayrı, uçtan uca şifreli bir kanalla paylaşılır. Eşitleme mevcut uzak belgeyi önce indirir, yerel kayıtlarla birleştirir, ardından sunucu revision numarasına karşı yazar; aynı anda başka cihaz yazmışsa sunucu çakışmayı reddeder. Bulut aile alanını silme yalnızca bulut kopyasını ve üyeliği kaldırır; bu cihazdaki veriye dokunmaz.

Aile sahibi davet oluşturabilir, aile şifreleme anahtarını bu cihazdan tekrar gösterebilir ve bulut aile alanını silebilir. Bakıcı üyeleri eşitleme yazma hakkına sahiptir; salt okunur aile üyeleri yalnızca indirebilir. Bu roller sunucudaki yetkilerle aynı tutulur. Aile anahtarının kaybolması halinde sunucudan kurtarılamaz; mevcut sahip cihazda SecureStore'dan gösterilip güvenli kanaldan yeniden paylaşılabilir.

## Amaç

Ebeveyn ve bakıcıların farklı telefonlardan aynı bebeğin bakım kayıtlarını görüp ekleyebilmesi. Mevcut SQLite depolaması çevrimdışı çalışmaya devam eder; ağ bağlantısı geldiğinde değişiklikler eşitlenir. Eşitleme isteğe bağlı olur ve kullanıcı açmadan hiçbir bebek verisi cihazdan çıkmaz.

## Sağlayıcı ve ücretsiz kullanım sınırı

İlk uygulama adayı Supabase'tir: Auth ve PostgreSQL aynı hizmette, mobil istemci desteği ve satır düzeyinde erişim denetimi (RLS) vardır. Resmî fiyatlandırma sayfasında ücretsiz planda 50.000 aylık aktif kullanıcı, 500 MB veritabanı, 5 GB dışa trafik ve 1 GB dosya alanı listeleniyor; iki ücretsiz proje sınırı ve bir hafta etkin olmayan projelerin duraklatılması da belirtiliyor. Bu nedenle ücretsiz plan geliştirme ve küçük aile grupları için denenebilir, fakat kesintisiz üretim hizmeti garantisi değildir. Ücretsiz plan sınırları ve koşulları değişebilir. Kaynaklar: [Supabase fiyatlandırması](https://supabase.com/pricing), [ücretsiz plan ve proje duraklatma](https://supabase.com/docs/guides/platform/billing-on-supabase).

## Önerilen güvenlik modeli

- Bulut eşitlemesi varsayılan olarak kapalı kalır; açılmadan önce hangi veri türlerinin eşitleneceği ve üçüncü taraf sunucuda saklanacağı açıklanır.
- Kullanıcılar e-posta ile kalıcı hesap açar. Anonim oturum tek başına yedekleme/geri dönüş kimliği sağlamaz.
- Erişim her tabloda RLS ile sınırlandırılır. İstemciye yalnızca publishable/anon anahtarı verilir; `service_role`/secret anahtar mobil uygulamaya konmaz.
- Aile daveti süreli, tek kullanımlık ve rastgele token taşır. Davet kabulü, aile üyesi kaydıyla aynı veritabanı işlemi içinde yapılır; davet oluşturma ve üyelik rolü değiştirme istemci tarafından doğrudan yazılamaz.
- Bebek sağlık, gelişim, beslenme ve uyku kayıtları hassas veri olduğundan, buluta açık JSON göndermek yerine istemci tarafında şifreleme seçeneği değerlendirilir. Anahtar telefonda güvenli donanım/OS kasasında tutulur ve davet sırasında ayrı, güvenli bir kanalla paylaşılır. Anahtar sunucuya gönderilmez.
- Üyelikten çıkarma ve hesap silme, erişimi sunucuda hemen keser. Aile sahibi aileyi ve bulut kopyasını silebilir; cihazdaki kopyayı koruma/silme seçimi ayrıca sunulur.

## Eşitleme ve çakışma

- Her bakım olayı ve görev sabit UUID ile saklanır. Eşitleme olay kayıtlarını UUID ile birleştirir; aynı olay iki kez eklenmez.
- Yerel uygulama ve yedek birleştirme akışında silinen olay, bakım görevi, gece uyanması, çocuk ve bakım veren kimlikleri `syncTombstones` içinde kalıcı silme işareti olarak saklanır. Birleştirme önce bu kimlikleri toplar ve eski kopyaları yeniden eklemez. İşaretler şu an zaman damgası/cihaz onayıyla temizlenmez; saklama sınırı ve bulut eşitlemesindeki iki cihazlı davranış ayrıca doğrulanmalıdır.
- Günlük check-in aynı tarih için alan bazında birleştirilir; gece uyanma kayıtları kendi UUID'leriyle birleştirilir.
- Uyku planı tercihlerinde her cihazın değişiklik saati ve kullanıcı kimliği tutulur. Çakışmada sessizce bir tarafı silmek yerine son değişiklik ve bakım veren adı gösterilip kullanıcıya seçim sunulur.
- Başlangıç tam yedeklemesi ve artımlı değişiklik kuyruğu, sunucu revizyon numarasıyla yapılır. Sunucudan çekme veya gönderme başarısız olursa yerel kayıtlar kullanılmaya devam eder ve senkronizasyon durumu görünür.
- Sağlık ve bakım olayları analitik/çökme raporlarına dahil edilmez.

### Yerel silme koruması

`AppState` şema sürümü 6 ile silme işaretleri yedek dışa aktarma/geri yükleme ve veri birleştirmede korunur. Eski yedeklerde alan yoksa boş listelerle göç edilir; bozuk kimlik listeleri yedekten reddedilir. Bu uygulama eski yedek/cihaz kayıtlarının yerel birleştirmede geri gelmesini engeller. Revizyon çakışmasında istemci son bulut kopyasını yeniden indirip birleştirerek en fazla üç yazma denemesi yapar. Barındırılan Supabase projesi ve iki fiziksel/emüle cihazlı eşitleme henüz doğrulanmadığı için bu, tamamlanmış bulut senkronizasyonu kanıtı sayılmaz.

İlk şema temeli `families`, `family_members`, `family_invites` ve `sync_documents` tablolarını oluşturur. Davet token'ı veritabanında yalnızca SHA-256 özeti olarak tutulur; 7 gün sonra geçersiz olur ve yalnızca davet edilen doğrulanmış e-posta kabul edebilir. Aile içindeki `family` rolü şifreli kayıtları okuyabilir; `parent` ve `caregiver` rollerine senkronizasyon yazma hakkı tanınır. İstemcilerin tabloları doğrudan yazma izni yoktur; yazma RPC'si üyeliği doğrular ve beklenen revision farklıysa çakışma hatası döndürür. İstemci veriyi uçtan uca şifrelemeden bu RPC kullanılmamalıdır.

## Önerilen tablolar

`families`, `family_members`, `family_invites`, `sync_documents` tabloları. `families` aile kimliğini; üyelik tablosu kullanıcı rolünü; davet tablosu token özeti, bitiş zamanı ve kullanım bilgisini; eşitleme belgesi ise şifreli çocuk verisi zarfını, revizyonu ve güncelleme zamanını taşır. Her tabloda RLS açılır, istemci rolleri için gereken en dar izinler tek tek verilir ve her izin/ret senaryosu veritabanı testiyle doğrulanır.

## Uygulamaya geçmeden önce gerekenler

1. Supabase projesi ve URL/publishable anahtarı kullanıcı tarafından oluşturulmalı; secret anahtar istemciye eklenmemeli.
2. Auth sağlayıcısı, yönlendirme URL'leri ve davet akışı panelde ayarlanmalı.
3. `supabase start` ile yerel yığını başlatıp `supabase test db` çalıştırın; yazılmış migration ve pgTAP testleri geçmeden uygulama entegrasyonu yapmayın.
4. Güvenli token saklama bağımlılığı ve iOS/Android cihazlar arası anahtar paylaşma akışı seçilmeli.
5. Ekranlarda açık rıza, yükleme/çakışma durumu, üyelik yönetimi ve bulut verisini silme akışı bulunmalı.

Uygulama bu aşamalar tamamlanana kadar cihaz içi, ücretsiz ve çevrimdışı çalışmaya devam eder; bu taslak hiçbir veri aktarımını başlatmaz.
