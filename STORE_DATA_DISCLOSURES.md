# Uykuva mağaza veri beyanı envanteri — taslak

Bu, Play Console **Data safety** ve App Store **App Privacy** formlarını doldurmaya hazırlık notudur; mağaza formu yerine geçmez. Envanter mevcut kaynak kodu ve yapılandırmaya dayanır. Üretim sürümünde son ağ trafiği, EAS ortam değişkenleri, işletim sistemi davranışı ve tüm SDK'lar denetlenmeden beyanları kesinleştirmeyin.

## Veri ve işleme akışları

| Veri grubu | Özellik / kaynak | Varsayılan akış | Bulut eşitlemesi açılırsa |
| --- | --- | --- | --- |
| Çocuk profili ve aile bilgileri (ad, doğum tarihi, bakım veren tercihleri) | Kullanıcı girişi, Aile ekranı | Cihazdaki SQLite veritabanı | Profil belgesine dahil edilebilir; Supabase'e gönderilmeden önce şifrelenir |
| Uyku, beslenme, bez, sağlık, gelişim, ilaç/randevu ve gebelik kayıtları | Kullanıcı girişi ve zamanlayıcılar | Cihazdaki SQLite veritabanı | Aile belgesine dahil edilebilir; Supabase'e gönderilmeden önce şifrelenir |
| Kullanıcı notları, uyku planı tercihleri ve bakım devri bilgileri | Kullanıcı girişi | Cihazda | Eşitlenen aile belgesine dahil edilebilir ve şifrelenir |
| Anı fotoğrafları | Kullanıcının fotoğraf seçiciden seçimi | Uygulama alanında, yerel yedek/PDF dışa aktarma kullanabilir | Senkronize edilen belgeye dahil edilebilir; eşitleme öncesi şifrelenir |
| E-posta adresi ve hesap kimlik bilgileri | Yalnızca Supabase aile hesabı | Bulut eşitlemesi kapalıyken istenmez | E-posta Supabase Auth üzerinden hesap kimliği olarak işlenir; parola doğrulaması sağlayıcı tarafından yürütülür |
| Mikrofon girdisi ve konuşmadan çıkan metin | Kullanıcı sesli notu başlatırsa | Ses yalnızca tanıma oturumu sırasında kullanılır; uygulama ses dosyası saklamaz. Kullanıcı metni nota kaydederse metin yerelde tutulur. | Nota eklenmiş metin aile belgesine dahil edilebilir; ham ses eşitlenmez |
| Bildirim içerikleri ve zamanları | Kullanıcının yerel hatırlatıcı tercihleri | Cihazdaki yerel bildirim planlayıcısı | Uygulama sunucusuna gönderilmez |
| Dışa aktarılan PDF/yedek | Kullanıcı paylaşım veya kaydetmeyi başlatır | İşletim sisteminin dosya/paylaşım seçicisi | Kullanıcının seçtiği hedef uygulama/konum işleyebilir; Uykuva'nın sunucusuna kendiliğinden gönderilmez |

## Mağaza formuna aktarırken

- **Sağlık ve çocuk bakımı verileri:** Uyku, beslenme, sağlık notları, gelişim gözlemleri ve gebelik kaydı uygulama özellikleri kapsamında kullanıcı tarafından girilir. Play Console sağlık uygulaması beyanını tüm bu işlevleri kapsayacak şekilde doldurun.
- **Kişisel bilgiler:** Çocuk/bakım veren profillerindeki adlar ve bulut hesabı kullanılırsa e-posta adresi. Bulut hesabı ilk üretim sürümünde etkinleştirilmeyecekse e-posta akışını o sürümün beyanından çıkarın.
- **Fotoğraf/video:** Kullanıcı seçtiği anı fotoğraflarını ekleyebilir. Platform seçicisinin erişim kapsamı ve eşitleme kapalı/açık davranışı release derlemesinde doğrulanmalı.
- **Ses:** Uygulama sesli not sırasında mikrofon izni alır; konuşma tanıma cihazda veya işletim sisteminin konuşma sağlayıcısında çalışabilir. Bu sağlayıcının ağı kullanıp kullanmadığını cihaz/işletim sistemi bazında denetleyin ve mağaza formu ile politikada doğru anlatın.
- **Veri aktarım güvenliği:** Uygulama sunucusuna giden aile belgesi yalnızca açık etkinleştirme bayrağı, Supabase yapılandırması ve kullanıcı onayıyla gönderilir; belge AES-GCM ile istemcide şifrelenir. Hesap e-postası ve sağlayıcı hesap metaverileri bu içerik şifrelemesinin dışında kalır.
- **Silme ve saklama:** Yerel kayıtlar uygulama içinden ve/veya uygulama verisi temizlendiğinde silinebilir. Hesap/senkronizasyon etkinleştirilmeden önce hesap silme, bulut belgelerini silme, saklama süresi ve Google'ın web üzerinden silme talep yolu tamamlanmalıdır.
- **Yedekleme:** Expo SecureStore Android yedeklerinden hariç tutulur. Android yedekleme kurallarının son merged manifestte ve iOS kullanıcı yedek davranışının release testinde doğrulanması gerekir.
- **Reklam/analitik/çökme SDK'sı:** Mevcut `package.json` bağımlılık listesinde reklam, analitik veya üçüncü taraf çökme raporlama SDK'sı görünmüyor. EAS release bağımlılık ağacı ve tüm native SDK'ları tekrar denetleyin.

## Doğrulama kaynakları

- [Google Play Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Google Play Data safety form](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Expo SecureStore Android yedekleme davranışı](https://docs.expo.dev/versions/latest/sdk/securestore/)
