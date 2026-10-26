# Uykuva

Uykuva, ebeveyn ve bakım verenlerin bebeğin uyku, beslenme ve günlük bakım ritmini birlikte takip etmesi için geliştirilen ücretsiz bir Expo/React Native uygulamasıdır.

## Mevcut özellikler

- Açıklanabilir uyku penceresi tahmini
- Son 14 günlük uyanıklık kayıtlarını sabah, öğle, akşam ve gece dilimlerine göre kullanan kişisel uyku penceresi
- Son 14 günde tekrar eden gündüz uykularından kişisel günlük taslak çıkarma
- İki haftanın kayıtlı gündüz uykusu örüntüsünü karşılaştırma; uyku geçişi tanısı veya kesin tahmin üretmez
- Devam eden uykunun canlı süresini gösterme
- Düşük parlaklıklı arayüzle uyku sayacı, beslenme ve bez kayıtlarına hızlı erişim sağlayan gece modu
- Yeterli benzer kayıt varsa devam eden uyku için geçmiş sürelerden uyanma aralığı gösterme
- Uyku, beslenme, bez ve bakım notu kaydı
- Emzirme zamanlayıcısında tek oturum içinde taraf değiştirme ve sol/sağ sürelerini ayrı görme
- İlkler için önerilen başlıklar ve ebeveynin kendi metniyle anı günlüğü
- Ortak bakım zaman çizelgesi
- Zaman çizelgesinde kayıt türü ve bakım veren adına göre arama/filtreleme
- Geçmiş uyku kaydı ekleme ve yatış/uyanış saatlerini düzeltme
- Zaman çizelgesinden beslenme, bez ve diğer kayıtların saatini düzeltme
- Aile nöbetine göre 2, 4, 6 veya 8 saatlik bakım devri özeti; pencere dışında başlamış açık emzirmeyi ve sol/sağ sürelerini de gösterme
- Üç yaklaşım içeren 14 günlük nazik uyku planı
- Yeni doğan, hazırlık ve destek azaltma aşamalarına göre her güne özel koçluk adımları ve sabah check-in soruları
- Yaş aşamasına ve seçilen yönteme göre gece uyanması için açılır adım adım rehber
- Hastalık, seyahat veya ihtiyaç değişikliğinde kaldığı günden sürdürülebilen uyku planı duraklatma
- Uyku planında günlük ilerleme göstergesi, her gün tek adım ve 14. gün için ayrı tamamlanma onayı
- Akşam rutini ve günlük görevler
- Kişisel akşam rutini adımlarını etkinleştirme ve sıraya koyma
- Etkin akşam rutini adımlarını sırayla uygulama ve tamamlanma özetini zaman çizelgesine kaydetme
- Günlük bakım özeti
- Gece yarısını aşan kayıtları günlere dağıtan yedi günlük uyku süresi grafiği
- Düzeltilmiş yaşı 9 haftadan küçük bebekler için kayan son 24 saat özeti
- İlk kurulum ve düzenlenebilir bebek/bakım veren profili
- Profil ve plan için SQLite saklama, bakım kayıtları için indeksli SQLite olay tablosu ve çevrimdışı göç
- İsteğe bağlı uyku penceresi bildirimleri
- Tahmini uyku aralığı geçip kayıt yoksa tek seferlik uyku kaydı sorusu
- Aşı ve doktor randevuları için ayarlanabilir yerel hatırlatmalar
- Son bez kaydından 2, 3 veya 4 saat sonra isteğe bağlı tek seferlik bez kontrol bildirimi
- Uyku planı için günlük kolaylık değerlendirmesi
- Günlük gece uyanma kaydı ve son yedi check-in ortalaması
- Sabah check-in'ine isteğe bağlı bağlam notu ekleme
- Uyku planı yaklaşımını yaş aşaması ve hazırlık listesine göre gösterme
- Yaşa göre ritim temelleri, nazik hazırlık ve kişisel plan ayrımı
- Uyku planı hazır oluş kontrol listesi
- Ateş, ilaç/belirti ve büyüme ölçümü kaydı
- Son sekiz büyüme ölçümünü tarih sırasıyla karşılaştırma
- Paylaşılabilir yedi günlük doktor özeti
- Kullanıcının eklediği aşı ve doktor randevusu takibi
- Doğum tarihine göre düzenlenebilir ulusal aşı takvimi önerileri
- Sessiz saatlere uyan uyku bildirimleri
- JSON yedeğini dosya olarak paylaşma veya sistem dosya seçicisinden geri yükleme; metin yapıştırma yedeği, tek seferlik telefonlar arası aktarım, doğrulama ve kontrollü cihaz verisi silme
- Sağ/sol emzirme zamanlayıcısı ve sıradaki taraf önerisi
- Sağım miktarı, saklama yeri ve sağılan süt stoğunun FIFO düşümü
- Biberon ve katı gıda ayrıntıları
- Katı öğünlerde yiyecek, alerjen etiketi ve ebeveyn gözlemi günlüğü
- Kayıt ritmine dayanan açıklanabilir sıradaki beslenme aralığı
- Doktor görüşmesi için yedi günlük bakım özetini PDF veya metin olarak paylaşma
- Aynı cihazda ebeveyn, aile üyesi ve bakıcı profilleri
- Aktif bakım vereni seçme ve kayıtları seçilen kişi adına yazma
- Kişisel uyku yaklaşımını, hedef saatleri, rutin adımlarını ve günlük rehberi bakım verenlerle paylaşma
- Gerçek gece kayıtlarını hedef yatışla karşılaştıran uyku koçu
- Akşam rutini bitişi ile uyku başlangıcı arasındaki ortanca süreyi gösteren kişisel içgörü
- Eşleşen son rutin kayıtlarından rutin bitişi ile uyku başlangıcı arasındaki ortanca süre
- Gecelik en fazla 15 dakikalık yatış saati ayarlaması
- Düzenlenebilir hedef saatler ve kişisel akşam rutini

Uygulama tıbbi tanı veya tedavi önermez.

## Kurulum

```powershell
npm.cmd install
npm.cmd start
```

## Doğrulama

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo-doctor
npx.cmd expo export --platform android --output-dir dist
```

Ürün ve teknik mimari için [ARCHITECTURE.md](./ARCHITECTURE.md) dosyasına bakın.
