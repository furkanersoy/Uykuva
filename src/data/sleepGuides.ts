export type SleepGuide = {
  id: string;
  title: string;
  age: string;
  summary: string;
  source: string;
  url: string;
};

// Short, offline summaries in our own words. Follow the source link for current guidance.
export const SLEEP_GUIDES: SleepGuide[] = [
  {
    id: "four-month-pattern",
    title: "Dört ay civarında uyku örüntüsü",
    age: "Yaklaşık 4 ay",
    summary: "AAP, bebeklerde daha düzenli uyku döngülerinin yaklaşık 4 ay civarında geliştiğini belirtiyor. Bu değişim her bebekte aynı görünmez ve gece uyanmalarının mutlaka biteceği anlamına gelmez. Tek başına uyku eğitimi başlama işareti değildir.",
    source: "AAP · Bebeğinizi uyutmaya yardımcı olma",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "sleep-changes",
    title: "Bebek uykusu neden değişir?",
    age: "Yenidoğan ve bebek",
    summary: "Yenidoğanlar çoğunlukla kısa aralıklarla uyur. Uyku düzeni büyümeyle değişir ve bebekler arasında farklılık gösterir; bir başkasının saat düzeni sizin bebeğiniz için hedef değildir.",
    source: "AAP · Bebeğinizin uykusu",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx"
  },
  {
    id: "night-and-day",
    title: "Gece ile gündüzü ayırt etmeye yardım",
    age: "İlk aylar",
    summary: "Gündüz doğal ışık ve olağan ev sesleri; gece ise loş ışık, sakin ses ve kısa bakım tercih edilebilir. Bu işaretler zamanla öğrenilir; ritmin hemen değişmesi beklenmez.",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "bedtime-routine",
    title: "Sakin bir akşam rutini kurma",
    age: "Bebeklikten itibaren",
    summary: "Kısa ve tekrarlanabilir birkaç sakin adım yatışa geçişi kolaylaştırabilir. Rutini ailenize ve bebeğinizin işaretlerine göre ayarlayın; banyo, kitap veya ninni şart değildir.",
    source: "NHS · Bebeğinizin uyumasına yardımcı olma",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "night-waking",
    title: "Gece uyanmaları ve beslenme",
    age: "Yenidoğan ve bebek",
    summary: "Gece uyanmaları bebeklikte olağandır. Bazı bebekler büyüdükçe daha uzun uyusa da hepsi aynı şekilde ilerlemez; açlık, bez, rahatsızlık ve sağlık ihtiyaçları uyku planından önce gelir.",
    source: "NHS · Uyku düzeni ve yaş dönemleri",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  },
  {
    id: "caregiver-rest",
    title: "Zor gecelerde bakım veren desteği",
    age: "Ebeveynler ve bakıcılar",
    summary: "Sık bölünen geceler yorucu olabilir. Mümkünse bakım işlerini paylaşın; emzirme varsa diğer bakım veren bez veya sabah bakımını devralabilir. Tek başınaysanız güvendiğiniz birinden destek isteyin.",
    source: "NHS · Bölünen gecelerle baş etme",
    url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/"
  }
];

