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
- Uyku planı için günlük kolaylık değerlendirmesi
- Yaşa göre ritim temelleri, nazik hazırlık ve kişisel plan ayrımı
- Uyku planı hazır oluş kontrol listesi
- Ateş, ilaç/belirti ve büyüme ölçümü kaydı
- Paylaşılabilir yedi günlük doktor özeti

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
