# Uykuva cihazlar arası eşitleme tasarımı

Durum: Taslak; uygulamada bulut eşitlemesi etkin değildir.

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
- Silmeler, çevrimdışı cihazlara da ulaşabilmeleri için eşitleme onayı gelene dek zaman damgalı tombstone olarak saklanır.
- Günlük check-in aynı tarih için alan bazında birleştirilir; gece uyanma kayıtları kendi UUID'leriyle birleştirilir.
- Uyku planı tercihlerinde her cihazın değişiklik saati ve kullanıcı kimliği tutulur. Çakışmada sessizce bir tarafı silmek yerine son değişiklik ve bakım veren adı gösterilip kullanıcıya seçim sunulur.
- Başlangıç tam yedeklemesi ve artımlı değişiklik kuyruğu, sunucu revizyon numarasıyla yapılır. Sunucudan çekme veya gönderme başarısız olursa yerel kayıtlar kullanılmaya devam eder ve senkronizasyon durumu görünür.
- Sağlık ve bakım olayları analitik/çökme raporlarına dahil edilmez.

## Önerilen tablolar

`families`, `family_members`, `family_invites`, `sync_documents` tabloları. `families` aile kimliğini; üyelik tablosu kullanıcı rolünü; davet tablosu token özeti, bitiş zamanı ve kullanım bilgisini; eşitleme belgesi ise şifreli çocuk verisi zarfını, revizyonu ve güncelleme zamanını taşır. Her tabloda RLS açılır, istemci rolleri için gereken en dar izinler tek tek verilir ve her izin/ret senaryosu veritabanı testiyle doğrulanır.

## Uygulamaya geçmeden önce gerekenler

1. Supabase projesi ve URL/publishable anahtarı kullanıcı tarafından oluşturulmalı; secret anahtar istemciye eklenmemeli.
2. Auth sağlayıcısı, yönlendirme URL'leri ve davet akışı panelde ayarlanmalı.
3. Migration, RLS politikaları ve izin testleri hazırlanıp boş bir projede çalıştırılmalı.
4. Güvenli token saklama bağımlılığı ve iOS/Android cihazlar arası anahtar paylaşma akışı seçilmeli.
5. Ekranlarda açık rıza, yükleme/çakışma durumu, üyelik yönetimi ve bulut verisini silme akışı bulunmalı.

Uygulama bu aşamalar tamamlanana kadar cihaz içi, ücretsiz ve çevrimdışı çalışmaya devam eder; bu taslak hiçbir veri aktarımını başlatmaz.

