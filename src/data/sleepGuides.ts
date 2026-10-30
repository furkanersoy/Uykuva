export type SleepGuide = {
  id: string;
  title: string;
  age: string;
  summary: string;
  category: SleepGuideCategory;
  source: string;
  url: string;
};

export type SleepGuideCategory = "basics" | "night" | "routine" | "feeding" | "changes" | "caregiver" | "naps";

export const SLEEP_GUIDE_CATEGORIES: { id: SleepGuideCategory; label: string }[] = [
  { id: "basics", label: "Temel bilgiler" },
  { id: "night", label: "Gece uyanmaları" },
  { id: "routine", label: "Rutin" },
  { id: "feeding", label: "Beslenme" },
  { id: "changes", label: "Zor günler" },
  { id: "caregiver", label: "Bakım veren" },
  { id: "naps", label: "Gündüz uykuları" }
];

// Short, offline summaries in our own words. Follow the source link for current guidance.
export const SLEEP_GUIDES: SleepGuide[] = [
  {
    id: "four-month-pattern",
    title: "Dört ay civarında uyku örüntüsü",
    age: "Yaklaşık 4 ay",
    summary: "AAP, bebeklerde daha düzenli uyku döngülerinin yaklaşık 4 ay civarında geliştiğini belirtiyor. Bu değişim her bebekte aynı görünmez ve gece uyanmalarının mutlaka biteceği anlamına gelmez. Tek başına uyku eğitimi başlama işareti değildir.",
    category: "basics",
    source: "AAP · Bebeğinizi uyutmaya yardımcı olma",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "sleep-changes",
    title: "Bebek uykusu neden değişir?",
    age: "Yenidoğan ve bebek",
    summary: "Yenidoğanlar çoğunlukla kısa aralıklarla uyur. Uyku düzeni büyümeyle değişir ve bebekler arasında farklılık gösterir; bir başkasının saat düzeni sizin bebeğiniz için hedef değildir.",
    category: "basics",
    source: "AAP · Bebeğinizin uykusu",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "safe-sleep-space",
    title: "Bebek için güvenli uyku alanı",
    age: "İlk yıl ve bebeklik",
    summary: "Her uykuda bebeği sırtüstü, sert, düz ve eğimsiz bir uyku yüzeyine yatırın; yatağı yastık, yorgan, oyuncak ve gevşek örtülerden boş tutun. İlk 6 ay bebeğin kendi ayrı uyku alanı ebeveynle aynı odada olabilir. Koltukta, kanepede veya yetişkin yatağında birlikte uyumak güvenli bir alternatif değildir. Bebek araba koltuğu, puset, salıncak veya taşıyıcıda uyuyakalırsa mümkün olan en kısa sürede sırtüstü ve düz bir uyku alanına alın. Uygun uyku alanı hakkında sorunuz varsa çocuk doktorunuza danışın.",
    category: "basics",
    source: "AAP · Güvenli uyku rehberi",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx"
  },
  {
    id: "swaddling-safely",
    title: "Bebeği güvenli biçimde sarma",
    age: "Yenidoğan · dönme işaretleri başlayana kadar",
    summary: "Sarmayı tercih ederseniz bebeği her uykuda sırtüstü yatırın; sarma göğsünü sıkıştırmamalı ve kalçalarının hareketini kısıtlamamalıdır. Bebek dönmeye çalıştığını gösterir göstermez sarmayı bırakın; bu işaret bazı bebeklerde erken başlayabilir. Ağırlıklı kundak veya ağırlık eklenmiş ürün kullanmayın. Sarma uykuya yardımcı olabilir ama ani bebek ölümü riskini azalttığı gösterilmemiştir.",
    category: "basics",
    source: "AAP · Güvenli uyku rehberi",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx"
  },
  {
    id: "night-and-day",
    title: "Gece ile gündüzü ayırt etmeye yardım",
    age: "İlk aylar",
    summary: "Gündüz doğal ışık ve olağan ev sesleri; gece ise loş ışık, sakin ses ve kısa bakım tercih edilebilir. Bu işaretler zamanla öğrenilir; ritmin hemen değişmesi beklenmez.",
    category: "routine",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "bedtime-routine",
    title: "Sakin bir akşam rutini kurma",
    age: "Bebeklikten itibaren",
    summary: "Kısa ve tekrarlanabilir birkaç sakin adım yatışa geçişi kolaylaştırabilir. Rutini ailenize ve bebeğinizin işaretlerine göre ayarlayın; banyo, kitap veya ninni şart değildir.",
    category: "routine",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "toddler-bedtime-resistance",
    title: "Yatma saatine direniyorsa",
    age: "Yaklaşık 1–5 yaş",
    summary: "Küçük çocuklar yatmaya geçişte zorlanabilir. Yatışa yakın kısa bir sakinleşme sırası, net bir iyi geceler adımı ve bakım verenlerin benzer yanıtı yardımcı olabilir. Yatma saati çocuğun alıştığı uykuya dalma saatinden çok erkense, NHS hedef saate küçük ve yavaş adımlarla yaklaşmayı önerir. Her çocuğun ritmi farklıdır.",
    category: "routine",
    source: "NHS · Küçük çocuklarda uyku",
    url: "https://www.nhs.uk/baby/health/sleep-and-young-children/"
  },
  {
    id: "screens-before-bed",
    title: "Yatmadan önce ekranları kapatma",
    age: "Küçük çocuklar ve okul öncesi",
    summary: "Telefon, tablet ve televizyonu yatma saatinden 30–60 dakika önce kapatıp bu zamanı kitap, sakin oyun veya sarılma gibi ekran dışı bir etkinlikle doldurabilirsiniz. Bu bir zorunluluk ya da uyku garantisi değildir; ailenizin uygulayabileceği sakin bir akşam sınırıdır.",
    category: "routine",
    source: "NHS · Küçük çocuklarda uyku",
    url: "https://www.nhs.uk/baby/health/sleep-and-young-children/"
  },
  {
    id: "night-waking",
    title: "Gece uyanmaları ve beslenme",
    age: "Yenidoğan ve bebek",
    summary: "Gece uyanmaları bebeklikte olağandır. Bazı bebekler büyüdükçe daha uzun uyusa da hepsi aynı şekilde ilerlemez; açlık, bez, rahatsızlık ve sağlık ihtiyaçları uyku planından önce gelir.",
    category: "night",
    source: "NHS · Uyku düzeni ve yaş dönemleri",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "separation-anxiety-and-sleep",
    title: "Ayrılık kaygısı ve gece uyanmaları",
    age: "Yaklaşık 6 ay–3 yaş",
    summary: "İlk yılın ikinci yarısından itibaren ayrılık kaygısı geceleri uykuyu geçici olarak bölebilir; çocuğunuz sizi veya daha sık yanında olan bir bakım vereni arayabilir. Bu çoğunlukla gelişimin olağan bir dönemidir. Sakin ve sevgi dolu yanıt verin; bakım verenler benzer bir yaklaşım belirleyebilir. Bu dönem uyku eğitimine başlama zorunluluğu değildir. Kaygı yoğun sürüyor veya günlük yaşamı belirgin etkiliyorsa çocuk doktorunuzla görüşün.",
    category: "night",
    source: "AAP · Ayrılık kaygısı ve uyku güçlüğü",
    url: "https://www.healthychildren.org/English/healthy-living/sleep/Pages/Separation-Anxiety-and-Sleeping.aspx"
  },
  {
    id: "caregiver-rest",
    title: "Zor gecelerde bakım veren desteği",
    age: "Ebeveynler ve bakıcılar",
    summary: "Sık bölünen geceler yorucu olabilir. Mümkünse bakım işlerini paylaşın; emzirme varsa diğer bakım veren bez veya sabah bakımını devralabilir. Tek başınaysanız güvendiğiniz birinden destek isteyin.",
    category: "caregiver",
    source: "NHS · Bölünen gecelerle baş etme",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "sleep-on-unusual-days",
    title: "Hastalık ve düzen değişikliğinde uyku",
    age: "Değişen günler",
    summary: "Hastalık, diş çıkarma ve günlük düzen değişiklikleri uykuyu etkileyebilir. Bu günlerde bebeğinizin işaretlerini izleyin. Uykuva'da gün bağlamını seçerek koçluk adımlarını bekletebilir, uyku ve bakım kayıtlarını sürdürebilirsiniz. Sağlık kaygınız varsa çocuk doktorunuza danışın.",
    category: "changes",
    source: "NHS · Uyku örüntüsündeki değişiklikler",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "nap-transitions",
    title: "Gündüz uykuları nasıl değişebilir?",
    age: "Yaklaşık 2–18 ay",
    summary: "Gündüz uykularının sayısı bebek büyüdükçe çoğunlukla azalır; 2–12 ay arasında üç-dört uykudan ikiye geçiş görülebilir, sabah uykusu da bazı çocuklarda 12–18 ay civarında sona erer. Bunlar geniş örüntülerdir, zorunlu takvim değildir. Bebeğinizin işaretlerini ve son günlerdeki kayıtlarını izleyin; yalnızca yaşına bakarak uykuyu kaldırmanız gerekmez.",
    category: "naps",
    source: "Children’s Health Queensland · Sağlıklı uyku",
    url: "https://www.childrens.health.qld.gov.au/health-a-to-z/healthy-sleep"
  },
  {
    id: "night-feeds-and-sleep-plans",
    title: "Gece beslenmesi uyku planından ayrıdır",
    age: "Yenidoğan ve bebek",
    summary: "Gece beslenme ihtiyacı bebeğin yaşına, büyümesine, sağlığına ve kendi beslenme planına göre değişir. Uyku yaklaşımı seçmek beslenmeyi bırakma veya erteleme anlamına gelmez. Açlık işaretlerine yanıt verin; beslenmeyi azaltmayı düşünüyorsanız, özellikle erken doğum veya kilo alımıyla ilgili kaygı varsa çocuk doktorunuza danışın.",
    category: "feeding",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "when-to-pause-sleep-plan",
    title: "Uyku planına ne zaman ara verilebilir?",
    age: "Bebek ve bakım verenler",
    summary: "Hastalık, ağrı, diş çıkarma veya seyahat gibi değişiklikler uyku örüntüsünü etkileyebilir. Böyle günlerde yeni bir uyku adımını sürdürmek zorunda değilsiniz; bebeğinizin ihtiyaçlarına yanıt verip olağan bakımınızı sürdürün. Sağlık kaygınız varsa sağlık uzmanınıza danışın. Uykuva'da gün bağlamını işaretlemek koçluk adımlarını bekletir, bakım kayıtlarını durdurmaz.",
    category: "changes",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  }
];
