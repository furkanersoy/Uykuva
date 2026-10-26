# Uykuva

Uykuva, ebeveyn ve bakım verenlerin bebeğin uyku, beslenme ve günlük bakım ritmini birlikte takip etmesi için geliştirilen ücretsiz bir Expo/React Native uygulamasıdır.

## Mevcut özellikler

- Açıklanabilir uyku penceresi tahmini
- Son 14 günlük uyanıklık kayıtlarından kişiselleşen uyku penceresi
- Devam eden uykunun canlı süresini gösterme
- Uyku, beslenme, bez ve bakım notu kaydı
- Ortak bakım zaman çizelgesi
- Geçmiş uyku kaydı ekleme ve yatış/uyanış saatlerini düzeltme
- Zaman çizelgesinden beslenme, bez ve diğer kayıtların saatini düzeltme
- Son dört saat için bakım devri özeti
- Üç yaklaşım içeren 14 günlük nazik uyku planı
- Akşam rutini ve günlük görevler
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
- Uyku planı yaklaşımını yaş aşaması ve hazırlık listesine göre gösterme
- Yaşa göre ritim temelleri, nazik hazırlık ve kişisel plan ayrımı
- Uyku planı hazır oluş kontrol listesi
- Ateş, ilaç/belirti ve büyüme ölçümü kaydı
- Paylaşılabilir yedi günlük doktor özeti
- Kullanıcının eklediği aşı ve doktor randevusu takibi
- Doğum tarihine göre düzenlenebilir ulusal aşı takvimi önerileri
- Sessiz saatlere uyan uyku bildirimleri
- JSON veri dışa aktarma ve kontrollü cihaz verisi silme
- Sağ/sol emzirme zamanlayıcısı ve sıradaki taraf önerisi
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
