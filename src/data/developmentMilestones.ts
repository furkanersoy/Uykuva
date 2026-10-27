export type DevelopmentDomain = "social" | "language" | "cognitive" | "movement";

export type DevelopmentMilestone = { id: string; label: string };
export type DevelopmentMilestoneGroup = { domain: DevelopmentDomain; label: string; items: DevelopmentMilestone[] };
export type DevelopmentCheckpoint = { ageMonths: 2 | 4 | 6 | 9 | 12 | 15 | 18; title: string; sourceUrl: string; groups: DevelopmentMilestoneGroup[] };

const group = (domain: DevelopmentDomain, label: string, age: number, labels: string[]): DevelopmentMilestoneGroup => ({
  domain,
  label,
  items: labels.map((item, index) => ({ id: `m${age}_${domain}_${index + 1}`, label: item }))
});

export const DEVELOPMENT_CHECKPOINTS: DevelopmentCheckpoint[] = [
  {
    ageMonths: 2, title: "2 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/2-months.html",
    groups: [
      group("social", "Sosyal ve duygusal", 2, ["Konuşunca veya kucağa alınınca sakinleşir", "Yüzünüze bakar", "Yanına geldiğinizde sizi gördüğüne sevinmiş görünür", "Konuştuğunuzda gülümser"]),
      group("language", "Dil ve iletişim", 2, ["Ağlama dışında sesler çıkarır", "Yüksek seslere tepki verir"]),
      group("cognitive", "Öğrenme ve problem çözme", 2, ["Siz hareket ederken gözleriyle izler", "Bir oyuncağa birkaç saniye bakar"]),
      group("movement", "Hareket ve fiziksel gelişim", 2, ["Yüzüstü ve uyanıkken başını kaldırır", "İki kolunu ve iki bacağını hareket ettirir", "Ellerini kısa süreliğine açar"])
    ]
  },
  {
    ageMonths: 4, title: "4 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/4-months.html",
    groups: [
      group("social", "Sosyal ve duygusal", 4, ["Dikkatinizi çekmek için kendiliğinden gülümser", "Onu güldürmeye çalıştığınızda kıkırdar", "Dikkatinizi almak veya sürdürmek için size bakar, hareket eder ya da ses çıkarır"]),
      group("language", "Dil ve iletişim", 4, ["“Ooo”, “aaah” gibi mırıldanma sesleri çıkarır", "Siz konuşunca sesle karşılık verir", "Sesinizin geldiği yöne başını çevirir"]),
      group("cognitive", "Öğrenme ve problem çözme", 4, ["Acıkınca göğüs veya biberon görünce ağzını açar", "Ellerine ilgiyle bakar"]),
      group("movement", "Hareket ve fiziksel gelişim", 4, ["Kucağınızdayken başını desteksiz sabit tutar", "Elinize koyduğunuz oyuncağı tutar", "Oyuncaklara koluyla uzanır veya vurur", "Ellerini ağzına götürür", "Yüzüstüyken dirseklerine veya ön kollarına dayanarak yükselir"])
    ]
  },
  {
    ageMonths: 6, title: "6 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/6-months.html",
    groups: [
      group("social", "Sosyal ve duygusal", 6, ["Tanıdığı kişileri bilir", "Aynada kendine bakmaktan hoşlanır", "Güler"]),
      group("language", "Dil ve iletişim", 6, ["Sizinle ses çıkarma sırası alır", "Dilini çıkarıp üfleyerek ses yapar", "İnce ve tiz çığlık sesleri çıkarır"]),
      group("cognitive", "Öğrenme ve problem çözme", 6, ["Keşfetmek için nesneleri ağzına götürür", "İstediği oyuncağa uzanır", "Daha fazla istemediğini dudaklarını kapatarak gösterir"]),
      group("movement", "Hareket ve fiziksel gelişim", 6, ["Yüzüstünden sırtüstüne döner", "Yüzüstüyken kollarını dirsekten düzleştirerek yükselir", "Otururken ellerine dayanarak destek alır"])
    ]
  },
  {
    ageMonths: 9, title: "9 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/9-months.html",
    groups: [
      group("social", "Sosyal ve duygusal", 9, ["Yabancıların yanında çekingen, yapışık veya korkmuş davranabilir", "Mutlu, üzgün, kızgın ve şaşkın gibi farklı yüz ifadeleri gösterir", "Adını söylediğinizde size bakar", "Ayrıldığınızda tepki verir; size bakar, uzanır veya ağlar", "Ce-ee oyununda gülümser veya güler"]),
      group("language", "Dil ve iletişim", 9, ["“Mamamama”, “babababa” gibi çeşitli sesler çıkarır", "Kucağa alınmak için kollarını kaldırır"]),
      group("cognitive", "Öğrenme ve problem çözme", 9, ["Görüş alanından çıkan oyuncağı arar", "İki nesneyi birbirine vurur"]),
      group("movement", "Hareket ve fiziksel gelişim", 9, ["Kendi başına oturma pozisyonuna geçer", "Nesneleri bir elinden diğerine aktarır", "Yiyeceği parmaklarıyla kendine doğru sıyırır", "Desteksiz oturur"])
    ]
  },
  {
    ageMonths: 12, title: "12 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/1-year.html",
    groups: [
      group("social", "Sosyal ve duygusal", 12, ["Ce-ee gibi sizinle oyunlar oynar"]),
      group("language", "Dil ve iletişim", 12, ["El sallar", "Bir ebeveyne “anne”, “baba” veya özel bir adla seslenir", "“Hayır”ı anlar; kısa süre durur veya bırakır"]),
      group("cognitive", "Öğrenme ve problem çözme", 12, ["Blok gibi bir nesneyi bardağa koyar", "Gizlediğiniz ve daha önce gördüğü nesneyi arar"]),
      group("movement", "Hareket ve fiziksel gelişim", 12, ["Ayağa kalkmak için tutunur", "Mobilyalara tutunarak yürür", "Siz tutarken kapaksız bardaktan içer", "Başparmağı ve işaret parmağı arasında küçük yiyecek parçalarını alır"])
    ]
  },
  {
    ageMonths: 15, title: "15 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/15-months.html",
    groups: [
      group("social", "Sosyal ve duygusal", 15, ["Oyun sırasında başka çocukları taklit eder", "Sevdiği bir nesneyi size gösterir", "Heyecanlanınca alkışlar", "Oyuncak bebeğe veya oyuncağa sarılır", "Size sarılarak, sokularak veya öperek sevgi gösterir"]),
      group("language", "Dil ve iletişim", 15, ["“Anne/baba” dışında bir iki kelime söylemeye çalışır", "Adını söylediğiniz tanıdık nesneye bakar", "El hareketi ve sözle verilen yönergeyi izler", "Bir şey istemek veya yardım almak için işaret eder"]),
      group("cognitive", "Öğrenme ve problem çözme", 15, ["Telefon, bardak veya kitap gibi eşyaları amacına uygun kullanmayı dener", "En az iki küçük nesneyi üst üste koyar"]),
      group("movement", "Hareket ve fiziksel gelişim", 15, ["Kendi başına birkaç adım atar", "Bazı yiyecekleri parmaklarıyla kendi yer"])
    ]
  },
  {
    ageMonths: 18, title: "18 ay", sourceUrl: "https://www.cdc.gov/act-early/milestones/18-months.html",
    groups: [
      group("social", "Sosyal ve duygusal", 18, ["Sizden uzaklaşıp yakında olup olmadığınızı kontrol eder", "İlginç bulduğu bir şeyi göstermek için işaret eder", "Elini yıkamanız için ellerini uzatır", "Sizinle kitapta birkaç sayfaya bakar", "Kolunu kolluğa veya ayağını paçaya uzatarak giyinmeye yardım eder"]),
      group("language", "Dil ve iletişim", 18, ["“Anne/baba” dışında en az üç kelime söylemeye çalışır", "El hareketi olmadan tek adımlı yönergeyi izler"]),
      group("cognitive", "Öğrenme ve problem çözme", 18, ["Süpürme gibi ev işlerini taklit eder", "Oyuncak arabayı itmek gibi basit biçimde oyuncaklarla oynar"]),
      group("movement", "Hareket ve fiziksel gelişim", 18, ["Bir yere tutunmadan yürür", "Karalama yapar", "Kapaksız bardaktan içer; bazen dökebilir", "Parmaklarıyla kendi kendini besler", "Kaşık kullanmayı dener", "Koltuk veya sandalyeye yardımsız çıkıp iner"])
    ]
  }
];

export function developmentCheckpointForAge(ageMonths: number) {
  return DEVELOPMENT_CHECKPOINTS.filter((item) => item.ageMonths <= ageMonths).at(-1);
}

