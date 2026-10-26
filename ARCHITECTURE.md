# Uykvua — Ürün ve Teknik Mimari

Son güncelleme: 26 Ekim 2026

## 1. Ürün amacı

Uykvua, 0–18 aylık bebeği olan ebeveyn ve bakım verenlerin günlük bakımı tek yerde yönetmesini amaçlayan, çevrimdışı çalışabilen bir mobil uygulamadır.

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
| Yerel saklama | AsyncStorage | İlk sürümde cihaz içi kalıcılık |
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
│   │   └── useUykvuaState.ts       # Uygulama durumu ve kullanıcı eylemleri
│   ├── data/
│   │   ├── seed.ts                 # Geliştirme başlangıç verisi
│   │   └── storage.ts              # Cihaz içi yükleme/kaydetme
│   ├── domain/
│   │   ├── types.ts                # Bebek, kayıt ve uyku planı veri modelleri
│   │   ├── sleep.ts                # Tahmin, koçluk ve devir özeti kuralları
│   │   └── sleep.test.ts           # Saf iş kuralları testleri
│   └── ui/
│       ├── components.tsx          # Ortak kart, buton ve etiket bileşenleri
│       └── theme.ts                # Renkler ve görsel token'lar
└── ARCHITECTURE.md                 # Bu doküman
```

## 5. Uygulama katmanları

### Sunum katmanı

`App.tsx`, alt gezinmeyi ve beş ana alanı içerir:

- **Bugün:** Sıradaki uyku aralığı, hızlı kayıt, bakım devri ve son kayıtlar.
- **Akış:** Uyku, beslenme, bez ve notların ortak zaman çizelgesi.
- **Uyku:** 14 günlük uyku planı, yaklaşım seçimi, günlük görevler ve akşam rutini.
- **Özet:** Günlük toplamlar ve ileride eklenecek doktor raporu alanı.
- **Aile:** Bakım rolleri, devir özeti ve paylaşım.

### Uygulama durumu

`useUykvuaState`, ekranların doğrudan depolama sistemiyle konuşmasını engeller. Şu eylemleri sağlar:

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

- `correctedAgeDays`: Prematüre bebeklerde ilk iki yıl düzeltilmiş yaşı hesaplar.
- `wakeBandFor`: Düzeltilmiş yaşa göre ürün referans aralığını seçer.
- `createSleepForecast`: Yaş aralığı ile son kullanılabilir uyanıklık sürelerini harmanlar.
- `coachingDay`: Seçilen yaklaşıma göre 14 günlük planın günlük görevlerini üretir.
- `handoffSummary`: Son dört saati bakım veren için kısa bir özete dönüştürür.

### Veri katmanı

İlk sürümde tüm durum tek bir sürümlü anahtarla AsyncStorage içinde tutulur:

```text
uykvua:state:v1
```

Bu seçim prototip için yeterlidir. Gerçek çoklu cihaz senkronizasyonundan önce veri deposu SQLite'a taşınmalı ve her bakım kaydı değiştirilemez bir olay olarak modellenmelidir.

## 6. Uyku tahmin motoru

Tahmin motorunun mevcut davranışı:

1. Düzeltilmiş yaş 9 haftadan küçükse tahmin göstermez.
2. Bitmiş son uyku kaydını bulur.
3. Yaşa uygun genel uyanıklık aralığını seçer.
4. Son 15 uyku içindeki geçerli uyanıklık sürelerini çıkarır.
5. En az üç kişisel örnek varsa yaş referansı ile kişisel medyanı harmanlar.
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
- [x] Uykvua marka adı ve paket kimlikleri tanımlandı.
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
- [x] Uyku tahmin motoru için birim testleri yazıldı.
- [x] Tüm özellikler ücretsiz bırakıldı; ödeme sistemi eklenmedi.

## 10. Henüz tamamlanmayanlar

- [ ] Gerçek kullanıcı onboarding'i ve bebek profili düzenleme
- [ ] SQLite tabanlı güçlü çevrimdışı depo ve veri göçleri
- [ ] Güvenli hesap sistemi ve çoklu cihaz senkronizasyonu
- [ ] Gerçek bakım veren daveti, roller ve erişim kaldırma
- [ ] Yerel bildirimler ve sessiz saatler
- [ ] Widget, iOS Live Activity ve saat uygulamaları
- [ ] WHO büyüme grafikleri
- [ ] Türkiye aşı takvimi
- [ ] Ek gıda ve alerjen günlüğü
- [ ] Ateş/ilaç geçmişi; doz önerisi olmadan
- [ ] Doktor görüşmesi için PDF raporu
- [ ] Sesli Türkçe kayıt
- [ ] İkiz ve çoklu bebek desteği
- [ ] Erişilebilirlik testi, ekran okuyucu etiketleri ve dinamik yazı boyutu
- [ ] KVKK aydınlatma/açık rıza akışları, veri dışa aktarma ve silme ekranları
- [ ] Uzman içerik incelemesi ve klinik kaynak sürümleme
- [ ] Gerçek cihaz, mağaza ve uçtan uca testleri

## 11. Sonraki geliştirme sırası

1. Kurulum/onboarding ve profil yönetimi
2. SQLite veri deposu ve güvenilir zamanlayıcılar
3. Yerel bildirimler, sessiz saatler ve tahmin hatırlatmaları
4. Aile hesabı, davet ve çevrimdışı senkronizasyon
5. Büyüme, aşı ve doktor raporu
6. Widget, Live Activity ve sesli kayıt
7. İçerik/uyku planlarının uzman doğrulaması
8. Kapalı beta, erişilebilirlik ve mağaza hazırlığı

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
- `npm.cmd test`: 5/5 test başarılı
- `npx.cmd expo-doctor`: 20/20 kontrol başarılı
- `npx.cmd expo export --platform android`: Android üretim paketi başarıyla oluşturuldu

`npm audit`, Expo CLI'nin dolaylı olarak kullandığı `node-forge` ve `zod` paketlerinde beş yüksek önem dereceli bildirim göstermektedir. npm'nin önerdiği otomatik zorlanmış çözüm Expo'yu 44 sürümüne düşürdüğü için uygulanmamıştır; bu kırıcı ve güvensiz bir sürüm gerilemesi olur. Bağımlılıklar Expo SDK 58 güncellemeleriyle takip edilmelidir. Bu paketler mevcut uygulama özelliklerinde kullanıcı verisini işleyen özel bir sunucu katmanı değildir, ancak mağaza sürümünden önce bildirimler yeniden değerlendirilmelidir.
