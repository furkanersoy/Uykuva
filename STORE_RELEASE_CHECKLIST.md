# Uykuva mağaza yayın hazırlığı

Bu belge 31 Ekim 2026 itibarıyla proje içindeki yapılandırmayı ve yayın öncesi işleri takip eder. Mağaza kuralları zamanla değişebileceği için yükleme öncesinde Play Console ve App Store Connect'te tekrar doğrulayın.

## Projede hazırlananlar

- Uygulama adı/slug: `Uykuva` / `uykuva`
- Android application ID: `com.uykuva.app`
- iOS bundle ID: `com.uykuva.app`
- Expo production build profili: `eas.json`
- Üretim Android çıktısı: Android App Bundle (`.aab`); dahili önizleme: APK
- Uygulama sürümü şu an `0.1.0`; mağaza sürüm numaraları yükleme öncesi belirlenmeli.
- Android API hedefi: Expo/RN yapılandırmasıyla derleme çıktısında doğrulanmalı; Play'in güncel hedef API kuralı yükleme tarihinde kontrol edilmeli.

## Yayından önce tamamlanması gerekenler

### Hesaplar ve imzalama

- [ ] EAS hesabı açıp projeyi `eas init` ile hesaba bağla.
- [ ] Google Play Console geliştirici hesabı oluştur; yeni kişisel hesap ise kapalı test şartını kontrol et.
- [ ] Apple Developer Program ve App Store Connect hesabı oluştur.
- [ ] Apple uygulama kaydını oluştur ve EAS iOS imzalama kimlik bilgilerini kur.
- [ ] Play ve Apple mağaza kayıtları için paket/bundle kimliklerinin boşta ve doğru olduğunu doğrula.

### Gizlilik ve çocuk/sağlık verileri

- [ ] Destek/gizlilik iletişim e-postasını belirle.
- [ ] `PRIVACY_POLICY_DRAFT.md` içeriğini gerçek veri akışlarıyla hukuk/gizlilik incelemesinden geçir, e-posta ve herkese açık HTTPS adresini ekle.
- [ ] Uygulama içinde gizlilik politikası bağlantısı ekle; mağaza formlarındaki URL ile aynı olsun.
- [ ] Uygulama sağlık/çocuk bakımına ilişkin içerik ve veri işlediğinden Play Console sağlık uygulaması beyanını tamamla; uygulamanın teşhis/tedavi vermediğini ve mağaza beyanlarını doğru anlat.
- [ ] Play Data safety ve Apple App Privacy formlarını her SDK/servis dahil gerçek ağ trafiğine göre doldur.
- [ ] Supabase bulut eşitleme şu an yapılandırma değişkenleri yokken kapalı kalmalı. Hesap oluşturma etkinleştirilecekse yayından önce hesap ve ilişkili verileri silme akışını uygulama içine ve Google için web üzerinden erişilebilir silme talep sayfasına ekle.
- [ ] Çocuk profili, sağlık kayıtları, fotoğraf ve sesle yazıya çevirme akışlarını mağaza politikaları ve hedef ülke mevzuatı açısından gözden geçir.

### Mağaza varlıkları ve kalite

- [ ] Google Play için 512×512 PNG, 1 MB altında mağaza ikonu üret. Mevcut `assets/icon.png` 1,242,915 bayt ve sınırı aşıyor; uygulama ikonundan ayrı optimize edilmiş mağaza görseli gerekiyor.
- [ ] Google Play özellik görseli (1024×500) ve farklı cihaz türlerinden ekran görüntüleri hazırla.
- [ ] App Store ekran görüntülerini gerekli iPhone/iPad boyutlarında hazırla; tablet desteği açık olduğu için iPad deneyimini de doğrula veya tablet desteğini kapat.
- [ ] Mağaza açıklamaları, yaş derecelendirmesi, destek URL'si, kategori ve içerik beyanlarını tamamla.
- [ ] Gerçek cihaz/emülatörde soğuk açılış, izinler, bildirimler, çevrimdışı çalışma, yedekleme/geri yükleme, hesap/senkronizasyon (etkinleştirilecekse) ve silme senaryolarını dene.
- [ ] Türkçe karakterlerin ve erişilebilir metinlerin tüm mağaza görsellerinde doğru göründüğünü doğrula.
- [ ] Release build'i mağaza öncesi kapalı test/TestFlight üzerinden test et; çökme ve ANR sorunlarını gider.

## EAS komutları

Hesap hazır olduğunda proje klasöründe:

```powershell
npx.cmd eas login
npx.cmd eas init
npx.cmd eas build --profile preview --platform android
npx.cmd eas build --profile production --platform android
npx.cmd eas build --profile production --platform ios
```

iOS derlemesi EAS bulutunda yapılabilir; App Store'a gönderim için Apple Developer ve App Store Connect yetkileri gerekir. Mağazaya yükleme bu belge/ayarların eklenmesiyle otomatik gerçekleşmez.

## Şimdiki durum

EAS, Apple Developer ve Play Console hesapları henüz hazır değil. Destek e-postası da daha sonra belirlenecek. Bu nedenle mağaza kaydı, imzalı üretim çıktısı, politika URL'si ve gönderim tamamlanmış sayılmaz.
