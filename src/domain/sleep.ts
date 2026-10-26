import { AppState, Baby, CareEvent, SleepForecast, SleepMethod } from "./types";

const DAY = 86_400_000;

type WakeBand = { maxAgeDays: number; min: number; max: number };

// Product reference ranges only. These are not a diagnosis or medical advice.
const WAKE_BANDS: WakeBand[] = [
  { maxAgeDays: 62, min: 45, max: 90 },
  { maxAgeDays: 92, min: 60, max: 110 },
  { maxAgeDays: 122, min: 75, max: 120 },
  { maxAgeDays: 183, min: 90, max: 150 },
  { maxAgeDays: 274, min: 120, max: 210 },
  { maxAgeDays: 365, min: 150, max: 240 },
  { maxAgeDays: 548, min: 180, max: 300 },
  { maxAgeDays: Number.POSITIVE_INFINITY, min: 240, max: 360 }
];

export function ageInDays(birthDate: string, now = new Date()): number {
  const born = new Date(`${birthDate}T12:00:00`);
  return Math.max(0, Math.floor((now.getTime() - born.getTime()) / DAY));
}

export function correctedAgeDays(baby: Baby, now = new Date()): number {
  const chronological = ageInDays(baby.birthDate, now);
  const prematureDays = Math.max(0, 40 - baby.gestationalWeek) * 7;
  return chronological < 730 ? Math.max(0, chronological - prematureDays) : chronological;
}

export function wakeBandFor(baby: Baby, now = new Date()): WakeBand {
  const age = correctedAgeDays(baby, now);
  return WAKE_BANDS.find((band) => age <= band.maxAgeDays) ?? WAKE_BANDS[WAKE_BANDS.length - 1]!;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export type DailySleepTotal = { date: string; label: string; totalMinutes: number; sleepCount: number };

export function weeklySleepTotals(events: CareEvent[], now = new Date()): DailySleepTotal[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (6 - index));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end, totalMinutes: 0, sleepCount: 0 };
  });
  for (const event of events) {
    if (event.kind !== "sleep") continue;
    const start = new Date(event.startedAt).getTime();
    const end = event.endedAt ? Math.min(new Date(event.endedAt).getTime(), now.getTime()) : now.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    for (const day of days) {
      const overlap = Math.min(end, day.end.getTime()) - Math.max(start, day.start.getTime());
      if (overlap <= 0) continue;
      day.totalMinutes += overlap / 60_000;
      day.sleepCount += 1;
    }
  }
  return days.map((day) => ({
    date: `${day.start.getFullYear()}-${String(day.start.getMonth() + 1).padStart(2, "0")}-${String(day.start.getDate()).padStart(2, "0")}`,
    label: day.start.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""),
    totalMinutes: Math.round(day.totalMinutes),
    sleepCount: day.sleepCount
  }));
}

function recentAwakeWindows(events: CareEvent[]): number[] {
  const sleeps = events
    .filter((event) => event.kind === "sleep" && event.endedAt)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-15);

  const windows: number[] = [];
  for (let index = 1; index < sleeps.length; index += 1) {
    const previous = sleeps[index - 1]!;
    const current = sleeps[index]!;
    const minutes = (new Date(current.startedAt).getTime() - new Date(previous.endedAt!).getTime()) / 60_000;
    if (minutes >= 25 && minutes <= 480) windows.push(minutes);
  }
  return windows;
}

export function createSleepForecast(baby: Baby, events: CareEvent[], now = new Date()): SleepForecast {
  const age = correctedAgeDays(baby, now);
  if (age < 63) {
    return {
      available: false,
      confidence: "low",
      explanation: "İlk 9 haftada kesin bir pencere önermiyoruz; yalnızca bebeğinizin sinyallerini ve günlük toplamları gösteriyoruz."
    };
  }

  const lastSleep = events
    .filter((event) => event.kind === "sleep" && event.endedAt)
    .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime())[0];

  if (!lastSleep?.endedAt) {
    return {
      available: false,
      confidence: "low",
      explanation: "İlk tahmin için bitmiş bir uyku kaydı gerekiyor."
    };
  }

  const band = wakeBandFor(baby, now);
  const personal = recentAwakeWindows(events);
  const personalMedian = median(personal);
  const baseline = (band.min + band.max) / 2;
  const target = personal.length >= 3 ? baseline * 0.35 + personalMedian * 0.65 : baseline;
  const spread = personal.length >= 7 ? 12 : personal.length >= 3 ? 18 : Math.max(20, (band.max - band.min) / 2);
  const wakeAt = new Date(lastSleep.endedAt);
  const start = new Date(wakeAt.getTime() + Math.max(band.min, target - spread) * 60_000);
  const end = new Date(wakeAt.getTime() + Math.min(band.max, target + spread) * 60_000);
  const awakeMinutes = Math.max(0, Math.floor((now.getTime() - wakeAt.getTime()) / 60_000));

  return {
    available: true,
    start,
    end,
    awakeMinutes,
    confidence: personal.length >= 7 ? "high" : personal.length >= 3 ? "medium" : "low",
    explanation:
      personal.length >= 3
        ? `Yaş aralığı ve son ${personal.length} kullanılabilir uyanıklık süresi birlikte değerlendirildi.`
        : "Şimdilik yaşa göre genel aralık kullanılıyor; üç düzenli kayıttan sonra kişiselleşecek."
  };
}

export type CoachingDay = {
  title: string;
  focus: string;
  tasks: string[];
  checkIn: string;
};

export type SleepProgramStage = {
  id: "newborn" | "foundations" | "plan";
  label: string;
  guidance: string;
  canReduceSupport: boolean;
};

export const SLEEP_READINESS_ITEMS = [
  "Bebek bugün hasta görünmüyor ve belirgin ağrı belirtisi yok",
  "Beslenme veya kilo alımıyla ilgili çözümlenmemiş bir endişe yok",
  "Uyku alanı güvenli, düz ve boş; bebek sırtüstü yatırılıyor",
  "Bakım verenler aynı nazik yaklaşımı uygulamayı kabul ediyor"
] as const;

export function sleepProgramStage(baby: Baby, now = new Date()): SleepProgramStage {
  const age = correctedAgeDays(baby, now);
  if (age < 112) {
    return {
      id: "newborn",
      label: "Ritim temelleri",
      guidance: "Bu dönemde uyku eğitimi uygulamıyoruz. Gündüz–gece ayrımı, güvenli uyku ve bebeğin sinyallerine hızlı yanıt öncelikli.",
      canReduceSupport: false
    };
  }
  if (age < 183) {
    return {
      id: "foundations",
      label: "Nazik hazırlık",
      guidance: "Tutarlı bir akşam sırası oluşturun; yardımı azaltmak zorunda değilsiniz. Yoğun huzursuzlukta her zaman yanıt verin.",
      canReduceSupport: false
    };
  }
  return {
    id: "plan",
    label: "Kişisel uyku planı",
    guidance: "Hazır oluş koşulları uygunsa seçtiğiniz desteği küçük adımlarla ve bebeğin tepkisine göre ayarlayabilirsiniz.",
    canReduceSupport: true
  };
}

const METHOD_COPY: Record<SleepMethod, { name: string; support: string }> = {
  responsive: { name: "Duyarlı rutin", support: "Ağlamaya hızlı yanıt vererek uyku işaretlerini ve tutarlı rutini güçlendirir." },
  gradual: { name: "Kademeli destek", support: "Her birkaç gecede yardımı küçük adımlarla azaltır; katı bir süre tutmaz." },
  camping: { name: "Yakında kalma", support: "Bakım veren odada kalır ve desteğini günler içinde yavaşça azaltır." }
};

export function methodDescription(method: SleepMethod) {
  return METHOD_COPY[method];
}

export function coachingDay(day: number, method: SleepMethod, canReduceSupport = true): CoachingDay {
  const safeDay = Math.min(14, Math.max(1, day));
  if (!canReduceSupport) {
    return {
      title: `${safeDay}. gün · Ritim temelleri`,
      focus: "Duyarlı bakım ve güvenli ritim",
      tasks: [
        "Sabah başlangıcını mümkün olduğunca tutarlı tut",
        "Gündüz doğal ışık ve yaşa uygun etkileşim sun",
        "Akşam rutinini sakin ve esnek biçimde uygula",
        "Uyku işaretlerine erken ve duyarlı yanıt ver",
        "Gece bakımını bebeğin sinyallerine ve beslenme ihtiyacına göre sürdür"
      ],
      checkIn: "Bu sabah bebeğinizin uyku işaretlerini ve gece uyanmalarını kısaca kaydedin."
    };
  }
  const phase = safeDay <= 3 ? 0 : safeDay <= 7 ? 1 : safeDay <= 10 ? 2 : 3;
  const shared = [
    ["Sabah başlangıcını aynı 30 dakikalık aralıkta tut", "Gündüz gün ışığı ve yaşa uygun hareket zamanı sun", "Akşam rutinini aynı sırayla uygula"],
    ["Son uykunun bitişini kaydet", "Uyku penceresinden 20 dakika önce ortamı sakinleştir", "Bebeği uykulu ama mümkünse uyanık yatır"],
    ["Gece desteğinde seçtiğin yaklaşımı tutarlı uygula", "Zor bir geceyi başarısızlık sayma", "Sabah kısa check-in doldur"],
    ["İşe yarayan adımları sabitle", "Yatma saatini gerekirse yalnızca 10–15 dakika değiştir", "Planı ailedeki diğer bakım verenle paylaş"]
  ];
  const methodTask: Record<SleepMethod, string[]> = {
    responsive: ["İlk huzursuzlukta ses ve dokunuşla yanıt ver", "Sakinleşmezse kucağa al; sakinleşince yeniden yatağa koy"],
    gradual: ["Bu gece alışılmış desteği yalnızca küçük bir adım azalt", "Yoğun huzursuzlukta geri dönüp sakinleştir"],
    camping: ["Yatağın yanında sakin ve görünür biçimde kal", "Her üç gecede mesafeyi küçük bir adım artır"]
  };
  return {
    title: `${safeDay}. gün · ${METHOD_COPY[method].name}`,
    focus: ["Ritmi gözlemle", "Tutarlı başlangıç", "Desteği ayarla", "Yeni rutini koru"][phase]!,
    tasks: [...shared[phase]!, ...methodTask[method]],
    checkIn: "Bu sabah uykuya geçiş dünden daha kolay mıydı?"
  };
}

function clockMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

function formatClock(minutes: number) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export type SleepCoachInsights = {
  actualBedtime?: string;
  targetBedtime: string;
  suggestedBedtime: string;
  adjustmentMinutes: number;
  checkInAverage?: number;
  nightWakingsAverage?: number;
  nightsUsed: number;
};

export function createSleepCoachInsights(events: CareEvent[], targetBedtime: string, checkIns: { ease?: number; nightWakings?: number }[]): SleepCoachInsights {
  const target = clockMinutes(targetBedtime) ?? 20 * 60;
  const nightStarts = events
    .filter((event) => {
      if (event.kind !== "sleep" || !event.endedAt) return false;
      const start = new Date(event.startedAt);
      const duration = (new Date(event.endedAt).getTime() - start.getTime()) / 60_000;
      return start.getHours() >= 17 && duration >= 120;
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 7)
    .map((event) => {
      const date = new Date(event.startedAt);
      return date.getHours() * 60 + date.getMinutes();
    });
  const actual = nightStarts.length ? median(nightStarts) : undefined;
  let delta = actual === undefined ? 0 : target - actual;
  if (delta > 720) delta -= 1440;
  if (delta < -720) delta += 1440;
  const adjustment = Math.max(-15, Math.min(15, Math.round(delta)));
  const recentCheckIns = checkIns.slice(0, 7);
  const easeRatings = recentCheckIns.flatMap((item) => item.ease === undefined ? [] : [item.ease]);
  const recordedWakings = recentCheckIns.flatMap((item) => item.nightWakings === undefined ? [] : [item.nightWakings]);
  const checkInAverage = easeRatings.length ? easeRatings.reduce((sum, value) => sum + value, 0) / easeRatings.length : undefined;
  const nightWakingsAverage = recordedWakings.length ? recordedWakings.reduce((sum, value) => sum + value, 0) / recordedWakings.length : undefined;
  return {
    actualBedtime: actual === undefined ? undefined : formatClock(actual),
    targetBedtime: formatClock(target),
    suggestedBedtime: formatClock((actual ?? target) + adjustment),
    adjustmentMinutes: adjustment,
    checkInAverage,
    nightWakingsAverage,
    nightsUsed: nightStarts.length
  };
}

export function handoffSummary(state: AppState, now = new Date()): string {
  const since = now.getTime() - 4 * 60 * 60 * 1000;
  const recent = state.events.filter((event) => new Date(event.startedAt).getTime() >= since);
  const feeds = recent.filter((event) => event.kind === "feed");
  const solidMeals = feeds.filter((event) => event.feedType === "solid");
  const amount = feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  const diapers = recent.filter((event) => event.kind === "diaper").length;
  const sleepMinutes = recent
    .filter((event) => event.kind === "sleep" && event.endedAt)
    .reduce((sum, event) => sum + (new Date(event.endedAt!).getTime() - new Date(event.startedAt).getTime()) / 60_000, 0);
  const parts = [`Son 4 saatte ${recent.length} kayıt`];
  if (feeds.length) parts.push(amount ? `${amount} ml beslenme` : `${feeds.length} beslenme`);
  if (solidMeals.length) {
    const tagged = [...new Set(solidMeals.flatMap((event) => event.allergens ?? []))];
    parts.push(`${solidMeals.length} katı öğün${tagged.length ? ` · etiketlenen: ${tagged.join(", ")}` : ""}`);
  }
  if (sleepMinutes) parts.push(`${Math.round(sleepMinutes)} dk uyku`);
  if (diapers) parts.push(`${diapers} bez`);
  return `${parts.join(" · ")}.`;
}
