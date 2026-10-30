export type SleepGuide = {
  id: string;
  title: string;
  age: string;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  requiresPrematurity?: boolean;
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
    minAgeMonths: 3,
    maxAgeMonths: 5,
    summary: "AAP, bebeklerde daha düzenli uyku döngülerinin yaklaşık 4 ay civarında geliştiğini belirtiyor. Bu değişim her bebekte aynı görünmez ve gece uyanmalarının mutlaka biteceği anlamına gelmez. Tek başına uyku eğitimi başlama işareti değildir.",
    category: "basics",
    source: "AAP · Bebeğinizi uyutmaya yardımcı olma",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "sleep-changes",
    title: "Bebek uykusu neden değişir?",
    age: "Yenidoğan ve bebek",
    minAgeMonths: 0,
    maxAgeMonths: 24,
    summary: "Yenidoğanlar çoğunlukla kısa aralıklarla uyur. Uyku düzeni büyümeyle değişir ve bebekler arasında farklılık gösterir; bir başkasının saat düzeni sizin bebeğiniz için hedef değildir.",
    category: "basics",
    source: "AAP · Bebeğinizin uykusu",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "safe-sleep-space",
    title: "Bebek için güvenli uyku alanı",
    age: "İlk yıl ve bebeklik",
    minAgeMonths: 0,
    maxAgeMonths: 12,
    summary: "Her uykuda bebeği sırtüstü, sert, düz ve eğimsiz bir uyku yüzeyine yatırın; yatağı yastık, yorgan, oyuncak ve gevşek örtülerden boş tutun. İlk 6 ay bebeğin kendi ayrı uyku alanı ebeveynle aynı odada olabilir. Koltukta, kanepede veya yetişkin yatağında birlikte uyumak güvenli bir alternatif değildir. Bebek araba koltuğu, puset, salıncak veya taşıyıcıda uyuyakalırsa mümkün olan en kısa sürede sırtüstü ve düz bir uyku alanına alın. Uygun uyku alanı hakkında sorunuz varsa çocuk doktorunuza danışın.",
    category: "basics",
    source: "AAP · Güvenli uyku rehberi",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx"
  },
  {
    id: "swaddling-safely",
    title: "Bebeği güvenli biçimde sarma",
    age: "Yenidoğan · dönme işaretleri başlayana kadar",
    minAgeMonths: 0,
    maxAgeMonths: 6,
    summary: "Sarmayı tercih ederseniz bebeği her uykuda sırtüstü yatırın; sarma göğsünü sıkıştırmamalı ve kalçalarının hareketini kısıtlamamalıdır. Bebek dönmeye çalıştığını gösterir göstermez sarmayı bırakın; bu işaret bazı bebeklerde erken başlayabilir. Ağırlıklı kundak veya ağırlık eklenmiş ürün kullanmayın. Sarma uykuya yardımcı olabilir ama ani bebek ölümü riskini azalttığı gösterilmemiştir.",
    category: "basics",
    source: "AAP · Güvenli uyku rehberi",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx"
  },
  {
    id: "night-and-day",
    title: "Gece ile gündüzü ayırt etmeye yardım",
    age: "İlk aylar",
    minAgeMonths: 0,
    maxAgeMonths: 6,
    summary: "Gündüz doğal ışık ve olağan ev sesleri; gece ise loş ışık, sakin ses ve kısa bakım tercih edilebilir. Bu işaretler zamanla öğrenilir; ritmin hemen değişmesi beklenmez.",
    category: "routine",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "bedtime-routine",
    title: "Sakin bir akşam rutini kurma",
    age: "Bebeklikten itibaren",
    minAgeMonths: 0,
    maxAgeMonths: 60,
    summary: "Kısa ve tekrarlanabilir birkaç sakin adım yatışa geçişi kolaylaştırabilir. Rutini ailenize ve bebeğinizin işaretlerine göre ayarlayın; banyo, kitap veya ninni şart değildir.",
    category: "routine",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "settling-supports",
    title: "Uykuya geçişte kullanılan destekler",
    age: "Bebek ve bakım verenler",
    minAgeMonths: 0,
    maxAgeMonths: 24,
    summary: "Kucakta sakinleşme, sallama, beslenme veya bakım verenin yanında olması uykuya geçişte kullanılan desteklerdir; bunları değiştirmek zorunlu değildir. Aileniz için değişiklik istiyorsanız, tek bir desteği bebeğinizin işaretlerine göre daha küçük bir adımla denemek ve huzursuzluk artarsa önceki desteğe dönmek bir seçenektir. Beslenme, yakınlık ve sağlık ihtiyaçlarını plana göre geciktirmeyin.",
    category: "routine",
    source: "AAP · Bebeğinizi uyutmaya yardımcı olma",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "responsive-settling-under-six-months",
    title: "İlk altı ayda duyarlı yatıştırma",
    age: "0–6 ay",
    minAgeMonths: 0,
    maxAgeMonths: 6,
    summary: "İlk aylarda bebekler sık beslenebilir ve sakinleşmek için bakım verenin yakınlığına ihtiyaç duyabilir. Kucağınızda sakinleştirme, nazik ses veya bebeğiniz rahat ediyorsa güvenli yatağında yanında olma seçeneklerinden size uygun olanı deneyin; huzursuzluk artarsa kucağa alıp ihtiyacına yanıt verin. Açlık veya sağlıkla ilgili bir kaygıda beslenmeyi ve bakımı uyku planı için geciktirmeyin; bu yaşta desteği azaltmak ya da kendi kendine uyumasını beklemek zorunlu değildir. Uykuya geçtiğinde bebeği sırtüstü, sert ve düz, boş ayrı uyku alanına yatırın.",
    category: "routine",
    source: "Raising Children Network · 0–6 ayda duyarlı yatıştırma",
    url: "https://raisingchildren.net.au/newborns/sleep/settling-routines/patting-settling"
  },
  {
    id: "toddler-bedtime-resistance",
    title: "Yatma saatine direniyorsa",
    age: "Yaklaşık 1–5 yaş",
    minAgeMonths: 12,
    maxAgeMonths: 60,
    summary: "Küçük çocuklar yatmaya geçişte zorlanabilir. Yatışa yakın kısa bir sakinleşme sırası, net bir iyi geceler adımı ve bakım verenlerin benzer yanıtı yardımcı olabilir. Yatma saati çocuğun alıştığı uykuya dalma saatinden çok erkense, NHS hedef saate küçük ve yavaş adımlarla yaklaşmayı önerir. Her çocuğun ritmi farklıdır.",
    category: "routine",
    source: "NHS · Küçük çocuklarda uyku",
    url: "https://www.nhs.uk/baby/health/sleep-and-young-children/"
  },
  {
    id: "screens-before-bed",
    title: "Yatmadan önce ekranları kapatma",
    age: "Küçük çocuklar ve okul öncesi",
    minAgeMonths: 12,
    maxAgeMonths: 60,
    summary: "Telefon, tablet ve televizyonu yatma saatinden 30–60 dakika önce kapatıp bu zamanı kitap, sakin oyun veya sarılma gibi ekran dışı bir etkinlikle doldurabilirsiniz. Bu bir zorunluluk ya da uyku garantisi değildir; ailenizin uygulayabileceği sakin bir akşam sınırıdır.",
    category: "routine",
    source: "NHS · Küçük çocuklarda uyku",
    url: "https://www.nhs.uk/baby/health/sleep-and-young-children/"
  },
  {
    id: "night-waking",
    title: "Gece uyanmaları ve beslenme",
    age: "Yenidoğan ve bebek",
    minAgeMonths: 0,
    maxAgeMonths: 24,
    summary: "Gece uyanmaları bebeklikte olağandır. Bazı bebekler büyüdükçe daha uzun uyusa da hepsi aynı şekilde ilerlemez; açlık, bez, rahatsızlık ve sağlık ihtiyaçları uyku planından önce gelir.",
    category: "night",
    source: "NHS · Uyku düzeni ve yaş dönemleri",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "separation-anxiety-and-sleep",
    title: "Ayrılık kaygısı ve gece uyanmaları",
    age: "Yaklaşık 6 ay–3 yaş",
    minAgeMonths: 6,
    maxAgeMonths: 36,
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
    minAgeMonths: 2,
    maxAgeMonths: 18,
    summary: "Gündüz uykularının sayısı bebek büyüdükçe çoğunlukla azalır; 2–12 ay arasında üç-dört uykudan ikiye geçiş görülebilir, sabah uykusu da bazı çocuklarda 12–18 ay civarında sona erer. Bunlar geniş örüntülerdir, zorunlu takvim değildir. Bebeğinizin işaretlerini ve son günlerdeki kayıtlarını izleyin; yalnızca yaşına bakarak uykuyu kaldırmanız gerekmez.",
    category: "naps",
    source: "Children’s Health Queensland · Sağlıklı uyku",
    url: "https://www.childrens.health.qld.gov.au/health-a-to-z/healthy-sleep"
  },
  {
    id: "night-feeds-and-sleep-plans",
    title: "Gece beslenmesi uyku planından ayrıdır",
    age: "Yenidoğan ve bebek",
    minAgeMonths: 0,
    maxAgeMonths: 24,
    summary: "Gece beslenme ihtiyacı bebeğin yaşına, büyümesine, sağlığına ve kendi beslenme planına göre değişir. Uyku yaklaşımı seçmek beslenmeyi bırakma veya erteleme anlamına gelmez. Açlık işaretlerine yanıt verin; beslenmeyi azaltmayı düşünüyorsanız, özellikle erken doğum veya kilo alımıyla ilgili kaygı varsa çocuk doktorunuza danışın.",
    category: "feeding",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "when-to-pause-sleep-plan",
    title: "Uyku planına ne zaman ara verilebilir?",
    age: "Bebek ve bakım verenler",
    minAgeMonths: 0,
    maxAgeMonths: 60,
    summary: "Hastalık, ağrı, diş çıkarma veya seyahat gibi değişiklikler uyku örüntüsünü etkileyebilir. Böyle günlerde yeni bir uyku adımını sürdürmek zorunda değilsiniz; bebeğinizin ihtiyaçlarına yanıt verip olağan bakımınızı sürdürün. Sağlık kaygınız varsa sağlık uzmanınıza danışın. Uykuva'da gün bağlamını işaretlemek koçluk adımlarını bekletir, bakım kayıtlarını durdurmaz.",
    category: "changes",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "reading-sleepy-cues",
    title: "Bebeğinizin uyku ve mola işaretlerini izleme",
    age: "Bebeklik",
    minAgeMonths: 0,
    maxAgeMonths: 12,
    summary: "Uykuya yaklaşırken göz kapaklarının ağırlaşması, bakışını çevirmesi veya hareketlerinin sakinleşmesi gibi işaretleri zamanla kendi bebeğinizde gözlemleyebilirsiniz; işaretler bebekten bebeğe ve yaşla birlikte değişir. Yalnızca tek bir işarete göre karar vermek yerine açlık, rahatsızlık ve etkileşime hazır olup olmadığını da değerlendirin. Ağlama farklı ihtiyaçların belirtisi olabilir; bebeğinizin işaretlerine yanıt verin.",
    category: "basics",
    source: "NHS · Bebeğinizi anlamak",
    url: "https://www.nhs.uk/best-start-in-life/baby/baby-basics/bonding-with-your-baby/understanding-your-baby/"
  },
  {
    id: "sleep-needs-by-age",
    title: "Yaşa göre toplam uyku aralıkları",
    age: "0–5 yaş",
    minAgeMonths: 0,
    maxAgeMonths: 60,
    summary: "CDC'nin aktardığı günlük toplam uyku aralıkları şöyledir: 0–3 ayda 14–17 saat, 4–12 ayda 12–16 saat, 1–2 yaşta 11–14 saat, 3–5 yaşta 10–13 saat. Bir yaş ve üzerindeki aralıklara gündüz uykuları dahildir. Bunlar geniş nüfus aralıklarıdır; tek bir günün kaydı, bebeğinizin sağlığını veya yeterince uyuyup uyumadığını tek başına göstermez. Bebeğiniz için kaygınız varsa çocuk doktorunuza danışın.",
    category: "basics",
    source: "CDC · Uyku hakkında",
    url: "https://www.cdc.gov/sleep/about/"
  },
  {
    id: "young-child-night-wakings",
    title: "Küçük çocuklarda yatma direnci ve gece uyanmaları",
    age: "Yaklaşık 1–5 yaş",
    minAgeMonths: 12,
    maxAgeMonths: 60,
    summary: "Küçük çocukların yatmaya geçişte zorlanması veya gece uyanması sık görülebilir. Sakin ve öngörülebilir bir akşam rutini yardımcı olabilir; her aile yalnızca kendisine ve çocuğuna uygun adımları seçmelidir. Uykuya dalma saati değişsin istiyorsanız, NHS yatış rutinini küçük adımlarla öne almayı anlatır. Sabit bir saat hedefi herkes için uygun değildir; beslenme, sağlık ve çocuğun güvenlik ihtiyacı önce gelir.",
    category: "night",
    source: "NHS · Küçük çocuklarda uyku",
    url: "https://www.nhs.uk/baby/health/sleep-and-young-children/"
  },
  {
    id: "nightmares-and-night-terrors",
    title: "Kabus ve gece terörü arasındaki fark",
    age: "Özellikle 3–8 yaş",
    minAgeMonths: 36,
    maxAgeMonths: 96,
    summary: "NHS'ye göre kabusta çocuk uyanıp gördüğü rüyayı hatırlayabilir; gece teröründe ise çocuk bağırıyor veya hareket ediyor görünse de uykuda olabilir ve olayı hatırlamayabilir. Gece terörü sırasında sakin kalıp çocuğun güvenliğini gözetin; onu zorla uyandırmaya çalışmayın. Tekrarlıyor, yaralanma riski doğuruyor veya sizi kaygılandırıyorsa sağlık uzmanına danışın. Bu kısa bilgi tanı koymaz.",
    category: "night",
    source: "NHS · Gece terörleri ve kâbuslar",
    url: "https://www.nhs.uk/conditions/night-terrors/"
  },
  {
    id: "snoring-and-sleep-breathing",
    title: "Horlama ve uyku sırasında solunum",
    age: "Bebek ve çocuk",
    summary: "Sık horlama veya uykuda nefeste duraklama fark ederseniz bunu uyku eğitimi sorunu olarak değerlendirmeyin; çocuk doktoruyla görüşün. Çocuğun nefesi duruyor, rengi soluk, mavi veya griye dönüyor ya da solunum güçlüğü varsa Türkiye'de 112'yi arayın. Bu belirtiler için uygulamadaki bir programa devam etmek yerine acil tıbbi yardım alın.",
    category: "changes",
    source: "AAP · Çocuklarda uyku apnesi belirtileri",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Sleep-Apnea-Detection.aspx"
  },
  {
    id: "corrected-age-for-preemies",
    title: "Erken doğumda düzeltilmiş yaş",
    age: "Erken doğan bebekler · ilk 2 yıl",
    minAgeMonths: 0,
    maxAgeMonths: 24,
    requiresPrematurity: true,
    summary: "Düzeltilmiş yaş, bebeğin beklenen doğum tarihinden bu yana geçen süreyi dikkate alır; gerçek doğum tarihini değiştirmez. AAP, erken doğan bebeklerin gelişim basamaklarını ilk 2 yıl değerlendirirken düzeltilmiş yaşın kullanılmasını anlatır. Uykuva da erken doğum kaydı varsa ilk 24 ay uyku penceresi ve gelişim gözlemlerinde bu hesabı kullanır; aşı tarihlerini gerçek doğum tarihine göre gösterir. Bebeğinize özel takip için çocuk doktorunuzun önerisini izleyin.",
    category: "basics",
    source: "AAP · Prematüre bebeklerde düzeltilmiş yaş",
    url: "https://www.healthychildren.org/English/ages-stages/baby/preemie/pages/Corrected-Age-For-Preemies.aspx"
  },
  {
    id: "safe-break-when-overwhelmed",
    title: "Ağlama çok bunaltıcı olduğunda güvenli mola",
    age: "Bebeklik · ebeveyn ve bakıcılar",
    minAgeMonths: 0,
    maxAgeMonths: 24,
    summary: "Uzun ağlama yorucu olabilir. Önce açlık, bez, rahatsızlık veya hastalık gibi ihtiyaçları değerlendirin. Gerginliğiniz artarsa bebeği sırtüstü, boş ve güvenli yatağına bırakıp birkaç dakika sakinleşmek için uzaklaşın; sonra geri dönüp kontrol edin ve güvendiğiniz birinden yardım isteyin. Bebeği asla sarsmayın veya vurmayın. Bu güvenli mola bir uyku eğitimi yöntemi değildir; bebeğinizin ihtiyacını veya sağlık kaygısında yardım alma gereğini ertelemeyin.",
    category: "caregiver",
    source: "AAP · Ağlayan bebeğin ihtiyaçlarına yanıt",
    url: "https://www.healthychildren.org/English/ages-stages/baby/crying-colic/Pages/Responding-to-Your-Babys-Cries.aspx"
  },
  {
    id: "cot-to-bed-transition",
    title: "Beşikten çocuk yatağına geçiş",
    age: "Yaklaşık 18 ay–4 yaş",
    minAgeMonths: 18,
    maxAgeMonths: 48,
    summary: "Beşikten yatağa geçmek için her çocukta geçerli tek bir yaş yoktur. NHS çocuk sağlığı rehberi bu geçişin çoğunlukla 18 ay–3 yaş arasında olduğunu; beşikten tırmanmaya çalışma veya yatağa rahatça sığmamanın geçiş işareti olabileceğini belirtiyor. Yeni yatakta da tanıdık akşam rutininizi sürdürün. Çocuğun odasını güvenli hâle getirin, merdiven ve pencere risklerini kontrol edin; yataktan kalkarsa sakin ve kısa biçimde yatağına geri götürebilirsiniz. Emin değilseniz sağlık ziyaretçiniz veya çocuk doktorunuzla görüşün.",
    category: "changes",
    source: "NHS Children’s Health · Güvenli uyku",
    url: "https://bedslutonchildrenshealth.nhs.uk/sleep/keeping-your-sleeping-baby-safe/"
  }
];

export function sleepGuidesForAge(ageMonths: number, isPremature = false): SleepGuide[] {
  return SLEEP_GUIDES.filter((guide) =>
    (!guide.requiresPrematurity || isPremature)
    &&
    (guide.minAgeMonths === undefined || ageMonths >= guide.minAgeMonths)
    && (guide.maxAgeMonths === undefined || ageMonths <= guide.maxAgeMonths)
  );
}
