# Uykuva

Uykuva, ebeveyn ve bakım verenlerin bebeğin uyku, beslenme ve günlük bakım ritmini birlikte takip etmesi için geliştirilen ücretsiz bir Expo/React Native uygulamasıdır.

## Android emülatöründe çalıştırma

Windows PowerShell'de proje klasörünü açın. Android Studio Device Manager'dan bir emülatör başlatın, sonra ilk kurulum için:

```powershell
npm.cmd install
npm.cmd run android
```

`android` komutu geliştirme sürümünü derler, çalışan emülatöre yükler ve Metro sunucusunu başlatır. İlk derleme biraz zaman alabilir. Uygulama `Uykuva · Development Build` ekranında sunucu bekliyorsa, bir sonraki bölümdeki Metro komutunu çalıştırıp terminalde `a` tuşuna basarak emülatörde açın.

JavaScript/arayüz değişikliklerini sonraki çalıştırmalarda görmek için:

```powershell
npm.cmd start -- --dev-client
```

Metro başladıktan sonra terminalde `a` tuşuna basarak Android emülatörünü açın; TypeScript/arayüz değişiklikleri Metro açıkken yenilenir. `npm.cmd run typecheck` TypeScript denetimini, `npm.cmd test` ise otomatik testleri çalıştırır. Yerel Android emülatöründe JavaScript paketi üretmek için `npx.cmd expo export --platform android` kullanılabilir; bu komut uygulamayı emülatöre yüklemez.

## Mevcut özellikler

- Açıklanabilir uyku penceresi tahmini
- Uyku sekmesinde, erken doğumda düzeltilmiş yaşa göre geçerli aralığı vurgulayan, yaş gruplarına göre uyanıklık aralığı rehberi
- Bugün ekranında kaydedilen uyku, beslenme, bez ve sağlık kayıtlarının hızlı özeti; ilk dokuz haftada kayan 24 saat, sonrasında yerel gün
- Kullanıcının girdiği sonraki ilaç planı kontrol hatırlatmasını önümüzdeki 24 saatlik bakım planında gösterme; doz veya ilaç aralığı önermez
- Android ana ekran widget'ında bebeğin adı, sıradaki uyku penceresi ve durum; widget'a dokununca Uykuva açılır
- İsteğe bağlı hastalık, seyahat, diş çıkarma ve düzen değişikliği günü işareti; bu günlerde olağan uyku penceresi ve hatırlatmalar duraklatılır
- Olağan dışı gün işaretlendiğinde uyku koçluğu görevlerini ve günlük plan ilerlemesini de duraklatma; günlük bakım kayıtları kullanılmaya devam eder
- Sabah check-in'inde uyanış saati girildiğinde ilk gündüz uykusu penceresini anında gösterme; ilk uyku kaydedilince sonraki tahminleri o uykudan sürdürme
- Ana uyku kartında pencereye kalan süreyi, pencere açıkken kalan dakikayı ve tahmini aralık geçince esnek yanıt mesajını gösterme
- Önerilen uyku penceresinden sonra açılan tek seferlik “uyudu mu?” sorusuyla gerçek uyku başlangıcını tahminle eşleştirme; en az üç eşleşmede sonraki pencerenin merkezini ve genişliğini bu geçmişe göre ayarlama
- Son 30 günlük uyanıklık kayıtlarını sabah, öğle, akşam ve gece dilimlerine göre kullanan kişisel uyku penceresi (kişisel örnek azsa yaş aralığına ağırlık verir)
- Uyku ekranında, son 30 gündeki altı zaman dilimi için kişisel uyanıklık medyanını ve örnek sayısını gösterme; eşik dolmadığında yaş rehberinin kullanıldığını belirtme
- Son 14 günde tekrar eden gündüz uykularından kişisel günlük taslak çıkarma
- Yeterli geçmiş kayıt olduğunda sıradaki gündüz uykularını 24 saatlik planda tarihsel aralıklarla görme
- İki haftanın kayıtlı gündüz uykusu örüntüsünü karşılaştırma; uyku geçişi tanısı veya kesin tahmin üretmez
- Devam eden uykunun canlı süresini gösterme
- İsteğe bağlı olası uyanış hatırlatması: devam eden uyku için en az beş benzer kayıt olduğunda tahmini uyanıştan 5, 10, 15, 20 veya 30 dakika önce yerel bildirim; sessiz saatlere uyar ve uyku bitince iptal edilir
- Düşük parlaklıklı arayüzle uyku sayacı, beslenme ve bez kayıtlarına hızlı erişim sağlayan gece modu
- Yeterli benzer kayıt varsa devam eden uyku için geçmiş sürelerden uyanma aralığı gösterme
- Uyku, beslenme, bez ve bakım notu kaydı
- Emzirme zamanlayıcısında tek oturum içinde taraf değiştirme ve sol/sağ sürelerini ayrı görme
- İlkler için önerilen başlıklar ve ebeveynin kendi metniyle anı günlüğü
- Anı günlüğüne fotoğraf ekleme; görseller cihazda küçültülerek saklanır ve yerel ya da şifreli yedeklere dahil edilir
- Düzeltilmiş takvim yaşına göre 2 ay–5 yaş CDC gelişim gözlem listeleri; ebeveyn yanıtları, geçmiş yaş listelerini gözden geçirme, notlar ve doktorla paylaşılabilir özet
- Ortak bakım zaman çizelgesi
- İkizler ve kardeşler için ayrı çocuk profilleri; uyku planı, bakım kayıtları, gelişim gözlemleri ve talimatları profil başına saklama
- Üst başlıktan, gece modundan veya Aile ekranından çocuk profilleri arasında geçiş yapma
- Uyku, rutin, aşı/randevu, bez, ilaç ve sağılmış süt hatırlatmalarını tüm çocuk profilleri için çocuğun adıyla planlama
- Bakım verene özel aile talimatlarını cihazda saklama ve isteğe bağlı devir özetine ekleme
- Zaman çizelgesinde kayıt türü ve bakım veren adına göre arama; birden fazla bakım veren için tek dokunuşla filtreleme
- Üst başlıkta ve gece modunda hızlı bakım veren değiştirme; yeni kayıtlar seçili kişinin adına eklenir
- Bakım kaydını zaman çizelgesinden silerken ikinci onay
- Geçmiş uyku kaydı ekleme ve yatış/uyanış saatlerini düzeltme
- Uyku kaydında uykuya geçiş desteğini isteğe bağlı işaretleme; zaman çizelgesi ve son 7 işaretli kayıtta tarafsız sıklık özeti
- Zaman çizelgesinden beslenme, bez ve diğer kayıtların saatini düzeltme
- Aile nöbetine göre 2, 4, 6 veya 8 saatlik bakım devri özeti; son beslenme/bez/uyku saatlerini, kaydı giren kişiyi ve pencere dışında başlamış açık emzirmenin sol/sağ sürelerini gösterme
- Bakım devri özetinde kullanılabilir sağılan süt stoğu, önce kullanılması gereken parti ve kullanım son saatini gösterme
- Bakım devrinde hedef yatış saatini, etkin uyku yaklaşımını ve kapalı olmayan akşam rutini adımlarını madde madde paylaşma
- Bakım devri özetinde seçilen zaman aralığına düşen, kullanıcı tarafından girilmiş sonraki ilaç planı kontrol saatlerini gösterme
- Bakım devri paylaşımına saatli gece uyanmalarının son 7 gündeki yanıt dağılımını ekleme; yalnızca kayıtları sayar, bakım önerisi üretmez
- Gün hastalık, seyahat, diş çıkarma veya düzen değişikliği olarak işaretlendiyse bakım devri özetinde nedeni ve koçluk planının beklediğini belirtme
- Bakım devri özetinde, günün uyanış saati veya son uykudan hesaplanan sıradaki uyku penceresini ve tahmin güven düzeyini gösterme
- Yedi yaklaşım içeren 14 günlük nazik uyku planı; yöntemleri ailenin yakınlık, desteği azaltma veya kısa kontrol tercihine göre filtreleme ve tüm seçenekleri karşılaştırma
- Uyku koçluğu planını son yedi gecenin check-in'leriyle metin veya A4 PDF olarak bakım verenlerle paylaşma
- Önceden kararlaştırılmış kısa kontroller yaklaşımı; Uykuva sabit aralık veya ağlama süresi önermez, beslenme ve sağlık ihtiyaçları her zaman önceliklidir
- Yeni doğan, hazırlık ve destek azaltma aşamalarına göre her güne özel koçluk adımları ve sabah check-in soruları
- Yaş aşamasına ve seçilen yönteme göre gece uyanması için açılır adım adım rehber
- Çevrimdışı kısa uyku öğrenme rehberi; bebek ritmi, esneyip bakışı kaçırma gibi değişken yorgunluk işaretleri, sakin rutin, gece bakım yanıtı ve güvenli uyku için NHS, AAP ve CDC kaynak bağlantıları
- Uyku rehberinde uykuda solunum güçlüğü, sık horlama veya zor uyandırılma gibi durumlarda doktor ya da acil yardım gerektirebilecek belirtileri açıklama; AAP ve NHS kaynak bağlantıları
- Uyku planı öncesi bakım verenlerin ortak yaklaşımını konuşma ve hastalık/seyahat/düzen değişikliğinde günlük koçluk adımlarını bekletme rehberi
- Hastalık, seyahat veya ihtiyaç değişikliğinde kaldığı günden sürdürülebilen uyku planı duraklatma
- Uyku planında günlük ilerleme göstergesi, her gün tek adım ve 14. gün için ayrı tamamlanma onayı
- Son check-in'lere göre desteği artırmayı veya mevcut rutini korumayı öneren, planı otomatik değiştirmeyen uyku koçu rehberi
- Saatli gece uyanması kayıtlarında son 7 günün verilen destek türlerini ve kayıtlı geceleri tarafsız biçimde özetleme; beslenmeyi erteleme veya plan değiştirme önerisi üretmez
- Check-in'deki gece yatış saati ile ilk uyku kaydını eşleştirerek son ve önceki 7 günün uykuya dalma süresi ortancasını gösterme; en az üç eşleşme gerekir ve tek başına plan değişikliği önermez
- Her iki haftada da en az üç eşleşen gece olduğunda uykuya dalma süresi ortancaları arasındaki farkı dakika olarak gösterme; yalnızca kayıt özeti sunar
- Tamamlanan 14 günlük plan döngülerinin görev toplamlarıyla sınırsız yerel geçmişi ve yedeklenmesi
- Akşam rutini ve günlük görevler
- İsteğe bağlı akşam rutini hatırlatması; hedef yatış ve etkin rutin süresinden hesaplanır, sessiz saatleri gözetir ve önümüzdeki yedi gün için cihazda planlanır
- Kişisel akşam rutini adımlarını etkinleştirme ve sıraya koyma
- Etkin akşam rutini adımlarını sırayla uygulama ve tamamlanma özetini zaman çizelgesine kaydetme
- Günlük bakım özeti
- Gece yarısını aşan kayıtları günlere dağıtan yedi günlük uyku süresi grafiği
- Düzeltilmiş yaşı 9 haftadan küçük bebekler için kayan son 24 saat özeti
- İlk kurulum ve düzenlenebilir bebek/bakım veren profili
- Profil ve plan için SQLite saklama, bakım kayıtları için indeksli SQLite olay tablosu ve çevrimdışı göç
- İsteğe bağlı uyku penceresi bildirimleri
- Uyku, rutin, bez, aşı/randevu, ilaç ve sağılan süt bildirimine dokununca ilgili ekranı açma; çoklu çocukta doğru çocuk profiline geçme ve gerekirse ilgili kayıt düzenlemesini açma
- Tahmini uyku aralığı geçip kayıt yoksa tek seferlik uyku kaydı sorusu
- Uyku sayacı 12 saati aşmışsa uygulama açıkken veya uygulamaya dönüldüğünde hâlâ sürüp sürmediğini sorma; otomatik süre düzeltmesi yapmama
- Aşı ve doktor randevuları için 15 dakika, 30 dakika, 1/2/3 saat veya 1 gün önceden ayarlanabilir yerel hatırlatmalar
- Son bez kaydından 2, 3 veya 4 saat sonra isteğe bağlı tek seferlik bez kontrol bildirimi
- Uyku planı için günlük kolaylık değerlendirmesi
- Günlük gece uyanma kaydı ve son yedi check-in ortalaması
- Bugün ekranından saatini ve verilen desteği belirleyerek gece uyanması kaydetme; kayıtları düzenleme, silme ve bakım devri/doktor özetinde görme
- Sabah check-in'ine isteğe bağlı bağlam notu ekleme
- Zamanlayıcı kullanılmayan geceler için isteğe bağlı yatış/sabah uyanış özeti; seyrek gece kayıtlarında yatış medyanını uyku koçuna katma
- Sabah check-in'inde gece aralığına denk gelen kaydedilmiş uyku sürelerini toplama ve ebeveynin bildirdiği uyanma sayısını gösterme
- Son yedi check-in gecesinin kaydedilen uyku toplamı ve bildirilen uyanma sayısına göre geçmişini görme
- Uyku planı yaklaşımını yaş aşaması ve hazırlık listesine göre gösterme
- Yaşa göre ritim temelleri, nazik hazırlık ve kişisel plan ayrımı
- Uyku planı hazır oluş kontrol listesi
- Ateş, ilaç/belirti ve büyüme ölçümü kaydı
- İlaç kaydında kullanıcının girdiği sonraki kontrol saatine tek seferlik yerel hatırlatma
- Son sekiz büyüme ölçümünü tarih sırasıyla karşılaştırma
- İsteğe bağlı WHO 0–5 yaş kilo, boy ve baş çevresi eğrileri; z-skoru/persentil özeti ve ölçüm konumu düzeltmesi
- Paylaşılabilir yedi günlük doktor özeti
- Kullanıcının eklediği aşı ve doktor randevusu takibi
- Aşı ve randevu kaydının tarih, saat ve notunu geçmişi koruyarak düzenleme
- Tamamlanan aşı ve randevular için tarihli geçmiş; aşı geçmişi doktor özetine eklenir ve işaretleme tarihi açıkça belirtilir. Silme işlemi ayrıca onay ister
- Doğum tarihine göre düzenlenebilir ulusal aşı takvimi önerileri
- Aşı önerilerinde kaynak sürümü ve resmi Sağlık Bakanlığı bağlantısı; 49–72 ay suçiçeği yakalama dönemi için aile hekimiyle teyit hatırlatması
- Sessiz saatlere uyan uyku bildirimleri
- Bebek uyurken bekleyen sonraki uyku hatırlatmasını iptal etme; sayaç bitince yeni tahmine göre tekrar planlama
- JSON yedeğini dosya olarak paylaşma veya sistem dosya seçicisinden içe aktarma; aynı bebeğe ait cihaz kayıtlarını kimlik tekrarlarını ayıklayarak birleştirme veya mevcut verilerin yerine tamamen geri yükleme, metin yapıştırma ve kontrollü cihaz verisi silme (silme uygulamanın önbellekteki yedeklerini ve planlı hatırlatmaları da kaldırır)
- Doktor özeti için son 7, 14 veya 30 günlük bakım kayıtları aralığını seçme; aynı aralıkta PDF veya metin paylaşma
- Varsayılan parola korumalı yedek aktarımı (PBKDF2-SHA256 ve AES-256-GCM); parola unutulursa yedek açılamaz. Şifresiz JSON aktarımı ayrıca uyarı onayı ister.
- Sağ/sol emzirme zamanlayıcısı ve sıradaki taraf önerisi
- Sağım miktarı, saklama yeri ve sağılan süt stoğunun FIFO düşümü; çözündürme için 24 saat, ısıtma/oda sıcaklığına gelme için iki saatlik kullanım penceresi
- İsteğe bağlı yerel bildirimle stokta kalan sağılan süt partisinin kullanım süresi yaklaşınca hatırlatma; otomatik zamanlama veya 2/6/12/24/48 saat önceden seçim, dondurulmuş sütte en iyi kalite ve tavsiye edilen son tarih bildirimleri, sessiz saatlere uyum
- Biberon ve katı gıda ayrıntıları
- Katı öğünlerde yiyecek, alerjen etiketi ve ebeveyn gözlemi günlüğü
- Katı gıdayı dışarıda tutan, son 30 günlük emzirme/biberon kayıtlarından açıklanabilir süt beslenmesi aralığı tahmini
- Uyku ve beslenme tahminleri, hedef yatış ve randevuları saat sırasıyla aynı 24 saatlik bakım planında görme
- Doktor görüşmesi için yedi günlük bakım özetini PDF veya metin olarak paylaşma
- Aynı cihazda ebeveyn, aile üyesi ve bakıcı profilleri
- Aktif bakım vereni seçme ve kayıtları seçilen kişi adına yazma
- Kişisel uyku yaklaşımını; bakım veren uygulamasını, gece yanıtını, yöntem özelliklerini, hedef saatleri, rutin adımlarını ve günlük rehberi bakım verenlerle paylaşma
- Paylaşılan uyku planına son 7 gecenin check-in sonuçlarını ve mevcutsa ilk/son dönem karşılaştırmasını ekleme
- Gerçek gece kayıtlarını hedef yatışla karşılaştıran uyku koçu
- Akşam rutini bitişi ile uyku başlangıcı arasındaki ortanca süreyi gösteren kişisel içgörü
- Eşleşen son rutin kayıtlarından rutin bitişi ile uyku başlangıcı arasındaki ortanca süre
- Gecelik en fazla 15 dakikalık yatış saati ayarlaması
- Düzenlenebilir hedef saatler ve kişisel akşam rutini

Uygulama tıbbi tanı veya tedavi önermez.

WHO büyüme tabloları WHO Anthro'nun [resmî kaynak deposundan](https://github.com/WorldHealthOrganization/anthro) alınmıştır. Eğriler bilgilendirme amaçlıdır; ölçümlerin klinik değerlendirmesi için çocuk sağlığı uzmanına başvurun.

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

