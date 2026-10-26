# Uykuva

Uykuva, ebeveyn ve bakım verenlerin bebeğin uyku, beslenme ve günlük bakım ritmini birlikte takip etmesi için geliştirilen ücretsiz bir Expo/React Native uygulamasıdır.

## Mevcut özellikler

- Açıklanabilir uyku penceresi tahmini
- Uyku, beslenme, bez ve bakım notu kaydı
- Ortak bakım zaman çizelgesi
- Son dört saat için bakım devri özeti
- Üç yaklaşım içeren 14 günlük nazik uyku planı
- Akşam rutini ve günlük görevler
- Günlük bakım özeti
- İlk kurulum ve düzenlenebilir bebek/bakım veren profili
- SQLite tabanlı çevrimdışı cihaz içi saklama
- İsteğe bağlı uyku penceresi bildirimleri
- Aşı ve doktor randevuları için ayarlanabilir yerel hatırlatmalar
- Uyku planı için günlük kolaylık değerlendirmesi
- Günlük gece uyanma kaydı ve son yedi check-in ortalaması
- Uyku planı yaklaşımını yaş aşaması ve hazırlık listesine göre gösterme
- Yaşa göre ritim temelleri, nazik hazırlık ve kişisel plan ayrımı
- Uyku planı hazır oluş kontrol listesi
- Ateş, ilaç/belirti ve büyüme ölçümü kaydı
- Paylaşılabilir yedi günlük doktor özeti
- Kullanıcının eklediği aşı ve doktor randevusu takibi
- Sessiz saatlere uyan uyku bildirimleri
- JSON veri dışa aktarma ve kontrollü cihaz verisi silme
- Sağ/sol emzirme zamanlayıcısı ve sıradaki taraf önerisi
- Biberon ve katı gıda ayrıntıları
- Katı öğünlerde yiyecek, alerjen etiketi ve ebeveyn gözlemi günlüğü
- Kayıt ritmine dayanan açıklanabilir sıradaki beslenme aralığı
- Doktor görüşmesi için yedi günlük bakım özetini PDF veya metin olarak paylaşma
- Aynı cihazda ebeveyn, aile üyesi ve bakıcı profilleri
- Aktif bakım vereni seçme ve kayıtları seçilen kişi adına yazma
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
