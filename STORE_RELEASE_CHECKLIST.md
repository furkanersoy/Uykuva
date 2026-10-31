# Uykuva mağaza yayın hazırlığı

Bu belge 31 Ekim 2026 itibarıyla proje içindeki yapılandırmayı ve yayın öncesi işleri takip eder. Mağaza kuralları zamanla değişebileceği için yükleme öncesinde Play Console ve App Store Connect'te tekrar doğrulayın.

## Projede hazırlananlar

- Uygulama adı/slug: `Uykuva` / `uykuva`
- Android application ID: `com.uykuva.app`
- iOS bundle ID: `com.uykuva.app`
- Expo production build profili: `eas.json`
- Üretim Android çıktısı: Android App Bundle (`.aab`); dahili önizleme: APK
- Uygulama sürümü şu an `0.1.0`; mağaza sürüm numaraları yükleme öncesi belirlenmeli.
- Android API hedefi: mevcut debug manifestinde 36 olarak doğrulandı; üretim AAB'sinde de yükleme öncesi kontrol edilmeli.
- Expo SDK 58 varsayılanları: Android target API 36, iOS minimum 16.4, Xcode minimum 26.4. EAS preview ve production iOS profilleri kararlı `macos-tahoe-26.5-xcode-26.6` imajına sabitlendi; SDK 58'in otomatik imajı şu anda Xcode 27.1 RC. [Expo SDK 58 platform tablosu](https://docs.expo.dev/versions/v58.0.0/) · [EAS iOS imajları](https://docs.expo.dev/build-reference/infrastructure/)
- Android release Gradle yapılandırması artık debug anahtarına düşmüyor. EAS imza anahtarını sağlamalı veya yerel release imzalama özellikleri tanımlanmalı.
- Google Play simgesi hazır: [`store-assets/google-play-icon-512.png`](store-assets/google-play-icon-512.png), 512×512 PNG, 240,464 bayt.
- Google Play özellik görseli hazır: [`store-assets/google-play-feature-1024x500.png`](store-assets/google-play-feature-1024x500.png), 1024×500 PNG.
- App Store uygulama simgesi hazır: [`assets/app-store-icon-1024.png`](assets/app-store-icon-1024.png), 1024×1024 opak PNG, 819,246 bayt; `app.json` bu dosyaya işaret ediyor. [Apple simge ölçüsü](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- `.easignore`, derleme sunucusuna yerel `android/` ve `ios/` klasörlerini göndermeyip Expo yapılandırmasından temiz native projeler üretmesini söyler.

## Doğrulanan güncel mağaza kuralları

- Google Play'in 31 Ağustos 2026'dan itibaren yeni uygulama ve güncellemeler için hedef API 36 şartı var. Yerel derlemenin debug manifesti `targetSdkVersion=36` gösteriyor; üretim AAB'si ayrıca denetlenmeli. [Google Play hedef API politikası](https://support.google.com/googleplay/android-developer/answer/11926878)
- Google Play sağlık uygulaması beyanı test kanalları dahil tüm Play uygulamaları için istenir. Uykuva'nın bakım ve sağlıkla ilgili işlevleri mağazada doğru beyan edilmeli. [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- Google Play simge şartı 512×512 PNG ve en fazla 1 MB; özellik görseli 1024×500 JPEG veya alfa içermeyen 24-bit PNG. Hazırlanan görseller boyut ve dosya ağırlığı bakımından bu değerlere uyuyor. [Play görsel şartları](https://support.google.com/googleplay/android-developer/answer/9866151)
- App Store Connect yüklemeleri 28 Nisan 2026'dan beri Xcode 26 veya sonrası ve iOS 26 SDK ya da sonrası ile derlenmeli. EAS üretim derlemesi bu SDK şartıyla yapılmalı. [Apple SDK şartı](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
- Sağlık/çocuk verileri ve varsa hesap oluşturma için gizlilik beyanı, uygulama içi politika bağlantısı ve hesap silme akışları mağaza politikalarıyla eşleşmeli. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Google hesap silme şartları](https://support.google.com/googleplay/android-developer/answer/13327111)

## Yayından önce tamamlanması gerekenler

### Hesaplar ve imzalama

- [ ] EAS hesabı açıp projeyi `eas init` ile hesaba bağla.
- [ ] Google Play Console geliştirici hesabı oluştur. Hesap 13 Kasım 2023 sonrası açılmış kişisel hesapsa, üretim erişimi başvurusu öncesinde en az 12 test kullanıcısının kapalı testte aralıksız 14 gün kayıtlı kalması gerekir. [Google test şartı](https://support.google.com/googleplay/android-developer/answer/14151465)
- [ ] Apple Developer Program ve App Store Connect hesabı oluştur.
- [ ] Apple uygulama kaydını oluştur ve EAS iOS imzalama kimlik bilgilerini kur.
- [ ] Play ve Apple mağaza kayıtları için paket/bundle kimliklerinin boşta ve doğru olduğunu doğrula.

### Gizlilik ve çocuk/sağlık verileri

- [ ] Destek/gizlilik iletişim e-postasını belirle.
- [ ] `PRIVACY_POLICY_DRAFT.md` içeriğini gerçek veri akışlarıyla hukuk/gizlilik incelemesinden geçir, e-posta ve herkese açık HTTPS adresini ekle.
- [x] Aile ve bakım ekranına gizlilik/veri kullanımı açıklaması eklendi; yayın URL'si olmadığında eksiklik uygulamada açıkça gösterilir.
- [ ] `EXPO_PUBLIC_PRIVACY_POLICY_URL` değerini herkese açık HTTPS politika adresiyle ayarla; uygulamadaki bağlantı ile mağaza formlarındaki URL aynı olmalı.
- [ ] Uygulama sağlık/çocuk bakımına ilişkin içerik ve veri işlediğinden Play Console sağlık uygulaması beyanını tamamla; uygulamanın teşhis/tedavi vermediğini ve mağaza beyanlarını doğru anlat.
- [ ] Play Data safety ve Apple App Privacy formlarını her SDK/servis dahil gerçek ağ trafiğine göre doldur.
- [ ] Formları doldururken [`STORE_DATA_DISCLOSURES.md`](STORE_DATA_DISCLOSURES.md) taslağını kullan; release ağ trafiği ve SDK denetiminden sonra her satırı doğrula.
- [ ] `EXPO_PUBLIC_ENABLE_CLOUD_SYNC` varsayılanı `false` kalmalı. Bulut eşitlemesini açmadan önce hesap ve ilişkili verileri silme akışını uygulama içine ve Google için web üzerinden erişilebilir silme talep sayfasına ekle; ardından gizlilik politikasını ve mağaza veri beyanlarını güncelle.
- [ ] Çocuk profili, sağlık kayıtları, fotoğraf ve sesle yazıya çevirme akışlarını mağaza politikaları ve hedef ülke mevzuatı açısından gözden geçir.

### Mağaza varlıkları ve kalite

- [x] Google Play için 512×512 PNG, 1 MB altında mağaza ikonu üretildi. Mevcut `assets/icon.png` 1,242,915 bayt olduğu için mağaza görseli ayrı optimize edildi.
- [x] Google Play özellik görseli (1024×500) hazırlandı.
- [x] iOS uygulama simgesi 1024×1024 opak PNG olarak hazırlandı.
- [ ] Farklı cihaz türlerinden gerçek uygulama ekran görüntüleri hazırla.
- [ ] App Store ekran görüntülerini gerekli iPhone/iPad boyutlarında hazırla; tablet desteği açık olduğu için iPad deneyimini de doğrula veya tablet desteğini kapat.
- [ ] Mağaza açıklamaları, yaş derecelendirmesi, destek URL'si, kategori ve içerik beyanlarını tamamla.
- [ ] Gerçek cihaz/emülatörde soğuk açılış, izinler, bildirimler, çevrimdışı çalışma, yedekleme/geri yükleme, hesap/senkronizasyon (etkinleştirilecekse) ve silme senaryolarını dene.
- [ ] Önceki Android geliştirme derlemesinde `updateSleepWindow` TurboModule argüman sayısı hatası raporlandı; GitHub'daki fazla JavaScript argümanı kaldırıldı ve regresyon testi eklendi. Güncel JS/native kodla Android uygulamasını yeniden yükleyip açılışta hatanın tekrarlanmadığını cihazda doğrula.
- [ ] Türkçe karakterlerin ve erişilebilir metinlerin tüm mağaza görsellerinde doğru göründüğünü doğrula.
- [x] Yüksek önem düzeyli Zod bildirimi Expo CLI'nin yamalı sürümünü lockfile'a alarak giderildi; `npm audit --omit=dev --audit-level=high` CI kontrolü geçti.
- [ ] Denetimde Expo derleme araçlarının kullandığı `glob` / `minimatch` kaynaklı 12 orta önem düzeyli paket bulgusu (iki temel advisory) kaldı (CVE/GHSA: [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249)). `npm audit fix --force` Expo SDK bağımlılıklarını uyumsuz ana sürümlere indirebildiğinden uygulanmadı; bu orta bulguları üretim öncesinde Expo uyumlu yamalarla yeniden değerlendir.
- [ ] Release build'i mağaza öncesi kapalı test/TestFlight üzerinden test et; çökme ve ANR sorunlarını gider.
- [ ] Üretim derlemelerinde kullanılan Android ve iOS SDK/Xcode sürümünü mağaza yüklemesinden önce doğrula.

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

## İmza anahtarı güvenliği

`android/app/build.gradle` release varyantı debug anahtarını kullanmaz. EAS Build, EAS hesabına bağlı imzalama anahtarını kurup release yapılandırmasını ekleyebilir. Kendi imza anahtarını kullanacaksan `MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_STORE_PASSWORD`, `MYAPP_UPLOAD_KEY_ALIAS` ve `MYAPP_UPLOAD_KEY_PASSWORD` değerlerini güvenli Gradle özellikleri olarak sağla; `credentials.json` ve keystore dosyaları `.gitignore` içindedir ve GitHub'a gönderilmemelidir. Keystore yedeğini güvenli, erişimi sınırlı bir yerde sakla.
