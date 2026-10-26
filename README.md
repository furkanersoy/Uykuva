# Uykuva

Uykuva, ebeveyn ve bakım verenlerin bebeğin uyku, beslenme ve günlük bakım ritmini birlikte takip etmesi için geliştirilen ücretsiz bir Expo/React Native uygulamasıdır.

## Mevcut özellikler

- Açıklanabilir uyku penceresi tahmini
- Son 14 günlük uyanıklık kayıtlarını sabah, öğle, akşam ve gece dilimlerine göre kullanan kişisel uyku penceresi
- Son 14 günde tekrar eden gündüz uykularından kişisel günlük taslak çıkarma
- Devam eden uykunun canlı süresini gösterme
- Düşük parlaklıklı arayüzle uyku sayacı, beslenme ve bez kayıtlarına hızlı erişim sağlayan gece modu
- Yeterli benzer kayıt varsa devam eden uyku için geçmiş sürelerden uyanma aralığı gösterme
- Uyku, beslenme, bez ve bakım notu kaydı
- İlkler için önerilen başlıklar ve ebeveynin kendi metniyle anı günlüğü
- Ortak bakım zaman çizelgesi
- Zaman çizelgesinde kayıt türü ve bakım veren adına göre arama/filtreleme
- Geçmiş uyku kaydı ekleme ve yatış/uyanış saatlerini düzeltme
- Zaman çizelgesinden beslenme, bez ve diğer kayıtların saatini düzeltme
- Son dört saat için bakım devri özeti
- Üç yaklaşım içeren 14 günlük nazik uyku planı
- Hastalık, seyahat veya ihtiyaç değişikliğinde kaldığı günden sürdürülebilen uyku planı duraklatma
- Akşam rutini ve günlük görevler
- Kişisel akşam rutini adımlarını etkinleştirme ve sıraya koyma
- Etkin akşam rutini adımlarını sırayla uygulama ve tamamlanma özetini zaman çizelgesine kaydetme
- Günlük bakım özeti
- Gece yarısını aşan kayıtları günlere dağıtan yedi günlük uyku süresi grafiği
- Düzeltilmiş yaşı 9 haftadan küçük bebekler için kayan son 24 saat özeti
- İlk kurulum ve düzenlenebilir bebek/bakım veren profili
- SQLite tabanlı çevrimdışı cihaz içi saklama
- İsteğe bağlı uyku penceresi bildirimleri
- Tahmini uyku aralığı geçip kayıt yoksa tek seferlik uyku kaydı sorusu
- Aşı ve doktor randevuları için ayarlanabilir yerel hatırlatmalar
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
- JSON veri dışa aktarma, doğrulanmış yedek geri yükleme ve kontrollü cihaz verisi silme
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
