# Google Play sağlık uygulaması beyanı taslağı

Bu taslak, 31 Ekim 2026 tarihli uygulama kodu ve Google Play yardım sayfalarına göre hazırlandı. Play Console'da beyanı uygulamanın gönderilecek son sürümüyle karşılaştırıp geliştirici olarak onaylayın; bu dosya mağaza formunun yerine geçmez.

## Uygulama kodunda bulunan sağlıkla ilgili özellikler

App.tsx ve sağlık/beslenme/uyku domain modüllerinde görülen özellikler:

- Uyku başlangıç/bitiş kayıtları, sabah uyanışından uyku penceresi tahmini, yaşa göre uyanıklık rehberi ve uyku hatırlatıcıları.
- Emzirme, biberon, sağılmış süt ve katı gıda beslenme kayıtları ile beslenme toplamları ve süt stoğu/son kullanma hatırlatıcıları.
- Sağlık kayıtlarında ateş/sıcaklık, belirti notu, ilaç adı ve kullanıcının girdiği doz; ayrıca ilaç hatırlatıcıları.
- Büyüme ölçümleri (kilo/boy) ve sağlık notları.
- Uykuda güvenliğe ilişkin açıklamalar ve AAP/NHS sağlık rehberlerine bağlantılar.
- İsteğe bağlı sesli not: konuşmayı metne dönüştürür. Uygulama ses dosyasını saklamadığını belirtir; çevrimdışı Türkçe model bulunmazsa kullanıcıya konuşmanın cihazın seçili tanıma servisi tarafından işlenebileceğini açıklar ve devam onayı ister. Android'de RECORD_AUDIO izni kullanılır.
- Mağaza sürümünde aile hesabı/bulut eşitlemesi Release derlemesinde kapalıdır. Uygulama Health Connect veya HealthKit'ten veri okumaz/yazmaz.

## Play Console'da incelenecek beyan

Google, tüm uygulamalardan Health apps declaration ister. Kod incelemesine göre aşağıdaki seçenekleri formdaki güncel kategori adlarıyla karşılaştırın:

- **Sleep Management:** uyku kaydı, uyku düzeni takibi, tahmini uyku pencereleri.
- **Nutrition and Weight Management:** bebek beslenme türü/miktarı kaydı ve beslenme özetleri; bu kapsamı Play Console'un güncel tanımıyla doğrulayın.
- **Medication and Treatment Management:** kullanıcının kendi eklediği ilaç adı/doz kaydı ve hatırlatıcılar; uygulama ilaç veya doz önermez.
- **Medical Reference and Education:** uygulama içindeki güvenli uyku/sağlık bilgileri ve dış sağlık kaynağı bağlantılarının bu kategoriye girip girmediğini son formda değerlendirin.
- Uygulama kodunda tıbbi cihaz işlevi, tanı, tedavi planı, klinik karar desteği veya harici tıbbi cihaz entegrasyonu görülmüyor. Bu nedenle tıbbi cihaz/klinik özellik beyanı yapmayın; ürünün/regülasyon durumunun farklı olduğuna dair bilgi çıkarsa tekrar değerlendirin.
- Health Connect / HealthKit entegrasyonu yoktur. Play formunda bu entegrasyonları kullandığını belirtmeyin.

Google, sağlık veya tıbbi işlev sunan uygulamalar için uygulama açıklamasında uygulamanın tıbbi cihaz olmadığını ve herhangi bir tıbbi durumu teşhis, tedavi, iyileştirme ya da önlemeyi amaçlamadığını açıkça söylemesini, ayrıca tıbbi öneri için sağlık uzmanına yönlendirmesini ister. Google Play ve App Store için hazırlanan Türkçe mağaza açıklamalarına bu bilgilendirme eklendi; ilgili metinleri son özelliklerle birlikte yeniden doğrulayın.

## Yayından önce zorunlu kontroller

- [ ] Play Console > App content > Health apps bölümünde gönderilecek son sürümdeki tüm özellikleri beyan et ve formu gönder.
- [ ] RECORD_AUDIO / konuşma tanıma akışında görünür açıklama ve olumlu kullanıcı onayını son Android sürümünde doğrula; sistem izin penceresi tek başına uygulama içi açıklama yerine geçmez.
- [ ] Her sağlık verisi, izin, işletim sistemi konuşma servisi ve üçüncü taraf için gizlilik politikasını güncelle; gizlilik politikası uygulama içinde ve Play Console'da erişilebilir olmalı.
- [ ] Gizlilik politikası URL'si aktif, herkese açık, coğrafi kısıtlamasız ve değiştirilebilir bir GitHub Markdown dosyası yerine sabit bir HTTPS web sayfası olmalı.
- [ ] Play Data safety beyanını gönderilecek Release derlemesinin gerçek veri akışı ve dahil edilen tüm SDK'larla karşılaştır.
- [ ] Uygulama içi sağlık uyarılarının ve mağaza açıklamasındaki tıbbi olmayan kullanım sınırının okunabilir olduğunu cihazda gözden geçir.
- [ ] App Store App Privacy alanlarını aynı veri akışı denetimine göre ayrıca doldur.

## Kaynaklar

- [Google Play: Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)
- [Google Play: Health app categories and additional information](https://support.google.com/googleplay/android-developer/answer/13996367?hl=en)
- [Google Play: Health Content and Services policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en)
- [Google Play: prominent disclosure and consent](https://support.google.com/googleplay/android-developer/answer/11150561?hl=en)
- [Apple: App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple: App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
