# Uykuva gizlilik politikası taslağı

> **Yayınlanmaya hazır değildir.** Destek e-postası ve herkese açık politika URL'si henüz belirlenmedi. Bu metni mağazaya koymadan önce uygulamanın son sürümündeki veri akışlarıyla karşılaştırın, eksik alanları tamamlayın ve yayımlanmış bir HTTPS sayfasında erişilebilir kılın.

**Son güncelleme:** 31 Ekim 2026  
**Geliştirici:** Uykuva geliştiricisi  
**Gizlilik/destek iletişimi:** Sonra belirlenecek

## Uygulama ve topladığı bilgiler

Uykuva; çocuk profili, uyku, beslenme, bez, sağlık, gelişim, bakım veren, hatırlatma, not ve anı kayıtları gibi kullanıcı tarafından girilen aile ve çocuk bakım bilgilerini işler. Kullanıcı anılarına fotoğraf ekleyebilir. Uygulamanın bazı özellikleri bu kayıtları cihazda saklar ve seçilen yedekleme/dışa aktarma işlemlerinde kullanır.

## Cihazda saklama

Bulut eşitleme yapılandırılmadığında uygulama kayıtları cihazdaki yerel veritabanında saklanır. Uygulama, kullanıcının seçtiği fotoğrafları anı kaydına ekleyebilir. İsteğe bağlı yedek veya PDF dışa aktarma, kullanıcının başlattığı paylaşım/kaydetme işlemine bağlıdır. Cihaz verisini silme, uygulamayı kaldırma veya yedekten geri yükleme davranışı işletim sistemi ve uygulama sürümüne göre değişebilir.

## İsteğe bağlı bulut eşitleme

Bulut aile eşitlemesi varsayılan olarak kapalıdır. Özellik yalnızca `EXPO_PUBLIC_ENABLE_CLOUD_SYNC=true` ve Supabase sunucu yapılandırması birlikte sağlandığında kullanılabilir; bu bayrak ilk mağaza sürümünde `false` kalmalıdır. Eşitleme etkinleştirilirse hesap e-posta adresi kimlik doğrulama için Supabase hizmetine gönderilebilir. Eşitleme kayıtları gönderilmeden önce uygulama tarafından şifrelenir; uygulama anahtar materyalini cihazın güvenli saklama alanında tutmayı amaçlar. Bu taslak, kullanılan hizmet sağlayıcısının alt işleyenlerini, veri konumlarını, saklama sürelerini ve silme akışını henüz kesinleştirmez. Bunlar doğrulanmadan eşitleme üretimde etkinleştirilmemelidir.

## Mikrofon ve konuşma tanıma

Sesli not özelliği kullanılırsa uygulama konuşmayı metne çevirmek üzere mikrofon izni isteyebilir. Tanıma cihazın çevrimdışı özelliğiyle veya işletim sisteminin konuşma tanıma hizmetiyle gerçekleşebilir. Uygulama ses kaydını saklamaz; kullanıcı metni notuna eklerse bu metin uygulama verisi olarak saklanabilir. İşletim sistemi/hizmet sağlayıcısının ses işleme koşulları ayrıca geçerlidir.

## Paylaşım ve üçüncü taraf hizmetler

Kullanıcı dışa aktarma veya paylaşımı başlatmadıkça uygulama kayıtları diğer uygulamalarla paylaşılmamalıdır. Bulut eşitleme etkinleştirilirse kimlik doğrulama ve barındırma için Supabase kullanılır. Mağaza sürümünden önce analitik, çökme raporlama, reklam, bildirim ve diğer tüm SDK'lar/işletim sistemi hizmetleri denetlenerek bu bölüm ve mağaza gizlilik beyanları güncellenmelidir.

## Saklama ve silme

Yerel kayıtlar kullanıcı cihazında uygulama kaldırılana veya uygulama içinden silinene kadar tutulabilir. Bulut eşitlemesi etkinleştirilirse kayıtların sunucudaki saklama ve silme süresi ayrıca açıklanmalıdır. Hesap oluşturma sunulacaksa kullanıcıya uygulama içinde hesabı ve ilişkili verileri silme yolu sağlanmalı; ilgili mağazaların istediği çevrimiçi silme talep sayfası da yayımlanmalıdır. Bu silme akışları tamamlanana kadar hesap oluşturma/bulut eşitleme üretimde etkinleştirilmemelidir.

## Çocuklara ilişkin bilgiler

Uykuva, ebeveynler ve bakım verenler tarafından aile/çocuk bakım kayıtlarını düzenlemek için tasarlanmıştır. Çocuk verilerini ebeveyn veya yetkili bakım veren girer. Uygulama çocuklara yönelik reklam veya çocuklardan doğrudan hesap oluşturma sunduğunu iddia etmez. Hedef ülke, yaş derecelendirmesi ve ilgili çocuk gizliliği kuralları yayından önce ayrıca incelenmelidir.

## Güvenlik ve sağlık sınırları

Uygulama verilerini korumak için cihazın güvenlik özelliklerinden yararlanır. Hiçbir elektronik aktarım/depolama yöntemi mutlak güvenlik garantisi vermez. Uyku aralıkları ve bakım içerikleri genel bilgilendirme niteliğindedir; tanı veya tedavi yerine geçmez. Sağlıkla ilgili kararlarda sağlık uzmanına başvurun.

## Değişiklikler ve iletişim

Bu politika güncellenebilir. Son sürümün tarihi yukarıda gösterilmelidir. Gizlilik veya veri talepleri için gerçek, izlenen ve kamuya açık bir iletişim adresi eklenmelidir: **[destek e-postası belirlenecek]**.
