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

type DayPart = "night" | "earlyMorning" | "morning" | "midday" | "afternoon" | "evening";

const DAY_PART_LABELS: Record<DayPart, string> = {
  night: "gece",
  earlyMorning: "erken sabah",
  morning: "sabah",
  midday: "öğle",
  afternoon: "öğleden sonra",
  evening: "akşam"
};

function dayPartFor(date: Date): DayPart {
  const hour = date.getHours();
  if (hour < 5 || hour >= 22) return "night";
  if (hour < 8) return "earlyMorning";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  return "evening";
}

function recentAwakeWindowsByDayPart(events: CareEvent[], now = new Date()): Record<DayPart, number[]> {
  const cutoff = now.getTime() - 14 * DAY;
  const sleeps = events
    .filter((event) => {
      if (event.kind !== "sleep" || !event.endedAt) return false;
      const start = new Date(event.startedAt).getTime();
      const end = new Date(event.endedAt).getTime();
      return Number.isFinite(start) && Number.isFinite(end) && start >= cutoff && end <= now.getTime() && end > start;
    })
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  const windows: Record<DayPart, number[]> = {
    night: [], earlyMorning: [], morning: [], midday: [], afternoon: [], evening: []
  };
  for (let index = 1; index < sleeps.length; index += 1) {
    const previous = sleeps[index - 1]!;
    const current = sleeps[index]!;
    const minutes = (new Date(current.startedAt).getTime() - new Date(previous.endedAt!).getTime()) / 60_000;
    if (minutes >= 25 && minutes <= 480) windows[dayPartFor(new Date(current.startedAt))].push(minutes);
  }
  for (const part of Object.keys(windows) as DayPart[]) windows[part] = windows[part].slice(-10);
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
  const personalByPart = recentAwakeWindowsByDayPart(events, now);
  const baseline = (band.min + band.max) / 2;
  const wakeAt = new Date(lastSleep.endedAt);
  const expectedSleepBlock = new Date(wakeAt.getTime() + baseline * 60_000);
  const dayPart = dayPartFor(expectedSleepBlock);
  const personal = personalByPart[dayPart];
  const requiredSamples = dayPart === "night" ? 2 : 5;
  const hasPersonalPattern = personal.length >= requiredSamples;
  const personalMedian = median(personal);
  const target = hasPersonalPattern ? baseline * 0.35 + personalMedian * 0.65 : baseline;
  const spread = hasPersonalPattern ? personal.length >= 8 ? 12 : 18 : Math.max(20, (band.max - band.min) / 2);
  const start = new Date(wakeAt.getTime() + Math.max(band.min, target - spread) * 60_000);
  const end = new Date(wakeAt.getTime() + Math.min(band.max, target + spread) * 60_000);
  const awakeMinutes = Math.max(0, Math.floor((now.getTime() - wakeAt.getTime()) / 60_000));

  return {
    available: true,
    start,
    end,
    awakeMinutes,
    confidence: hasPersonalPattern ? personal.length >= 8 ? "high" : "medium" : "low",
    explanation: hasPersonalPattern
      ? `${DAY_PART_LABELS[dayPart]} saat dilimindeki son ${personal.length} uyanıklık kaydı ve yaş aralığı birlikte değerlendirildi.`
      : `${DAY_PART_LABELS[dayPart]} saat diliminde kişisel tahmin için yeterli kayıt yok (${personal.length}/${requiredSamples}); yaş aralığı kullanılıyor.`
  };
}

export type SleepWakeEstimate = {
  available: boolean;
  from?: Date;
  typical?: Date;
  to?: Date;
  sampleCount: number;
  explanation: string;
};

function percentile(sortedValues: number[], fraction: number) {
  if (sortedValues.length === 1) return sortedValues[0]!;
  const position = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight;
}

export function estimateSleepWakeWindow(events: CareEvent[], runningSleep?: CareEvent, now = new Date()): SleepWakeEstimate {
  if (!runningSleep || runningSleep.kind !== "sleep" || runningSleep.endedAt) {
    return { available: false, sampleCount: 0, explanation: "Devam eden uyku yok." };
  }
  const sleepStart = new Date(runningSleep.startedAt);
  if (!Number.isFinite(sleepStart.getTime()) || sleepStart.getTime() > now.getTime()) {
    return { available: false, sampleCount: 0, explanation: "Uyku başlangıç saati kontrol edilemiyor." };
  }
  const startsAtNight = (date: Date) => date.getHours() >= 18 || date.getHours() < 6;
  const night = startsAtNight(sleepStart);
  const cutoff = now.getTime() - 30 * DAY;
  const durations = events.flatMap((event) => {
    if (event.id === runningSleep.id || event.kind !== "sleep" || !event.endedAt) return [];
    const start = new Date(event.startedAt);
    const end = new Date(event.endedAt);
    const duration = (end.getTime() - start.getTime()) / 60_000;
    const inRange = night ? duration >= 120 && duration <= 900 : duration >= 20 && duration <= 240;
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.getTime() < cutoff || start.getTime() > now.getTime() || !inRange || startsAtNight(start) !== night) return [];
    return [{ start: start.getTime(), duration }];
  }).sort((a, b) => b.start - a.start).slice(0, 10).map((item) => item.duration).sort((a, b) => a - b);

  if (durations.length < 5) {
    return { available: false, sampleCount: durations.length, explanation: `Benzer uyku süresi aralığı için son 30 günde en az 5 tamamlanmış kayıt gerekiyor (${durations.length}/5).` };
  }
  const elapsed = (now.getTime() - sleepStart.getTime()) / 60_000;
  const projectedTime = (durationMinutes: number) => new Date(now.getTime() + Math.max(0, durationMinutes - elapsed) * 60_000);
  return {
    available: true,
    from: projectedTime(percentile(durations, 0.25)),
    typical: projectedTime(percentile(durations, 0.5)),
    to: projectedTime(percentile(durations, 0.75)),
    sampleCount: durations.length,
    explanation: `Son 30 gündeki ${durations.length} benzer uykunun süre dağılımı. Bu bir alarm veya kesin uyanma saati değildir.`
  };
}

export type DailyNapOutlineRow = {
  order: number;
  from: Date;
  typical: Date;
  to: Date;
  sampleCount: number;
  actualStart?: Date;
  inProgress: boolean;
};

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isDaytimeNap(event: CareEvent, now: Date) {
  if (event.kind !== "sleep") return false;
  const start = new Date(event.startedAt);
  if (!Number.isFinite(start.getTime()) || start.getHours() < 6 || start.getHours() >= 18) return false;
  const end = event.endedAt ? new Date(event.endedAt) : now;
  const duration = (end.getTime() - start.getTime()) / 60_000;
  return duration >= 15 && duration <= 240;
}

function atLocalClock(reference: Date, minutes: number) {
  const value = new Date(reference);
  value.setHours(0, 0, 0, 0);
  value.setMinutes(minutes);
  return value;
}

export function createDailyNapOutline(events: CareEvent[], now = new Date()): DailyNapOutlineRow[] {
  const cutoff = now.getTime() - 14 * DAY;
  const completedByDay = new Map<string, CareEvent[]>();
  for (const event of events) {
    const start = new Date(event.startedAt);
    if (!event.endedAt || start.getTime() < cutoff || start.getTime() > now.getTime() || !isDaytimeNap(event, now)) continue;
    const key = localDayKey(start);
    const group = completedByDay.get(key) ?? [];
    group.push(event);
    completedByDay.set(key, group);
  }
  const todayKey = localDayKey(now);
  const history = [...completedByDay.entries()].filter(([day]) => day !== todayKey).map(([, group]) => group.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()));
  const todayNaps = events
    .filter((event) => localDayKey(new Date(event.startedAt)) === todayKey && isDaytimeNap(event, now))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const maxNaps = Math.min(4, Math.max(0, ...history.map((group) => group.length)));
  const rows: DailyNapOutlineRow[] = [];
  for (let index = 0; index < maxNaps; index += 1) {
    const starts = history.flatMap((group) => {
      const event = group[index];
      if (!event) return [];
      const date = new Date(event.startedAt);
      return [date.getHours() * 60 + date.getMinutes()];
    }).sort((a, b) => a - b);
    if (starts.length < 3) break;
    const actual = todayNaps[index];
    rows.push({
      order: index + 1,
      from: atLocalClock(now, percentile(starts, 0.25)),
      typical: atLocalClock(now, percentile(starts, 0.5)),
      to: atLocalClock(now, percentile(starts, 0.75)),
      sampleCount: starts.length,
      actualStart: actual ? new Date(actual.startedAt) : undefined,
      inProgress: Boolean(actual && !actual.endedAt)
    });
  }
  return rows;
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

export function handoffSummary(state: AppState, now = new Date(), windowHours: 2 | 4 | 6 | 8 = 4): string {
  const since = now.getTime() - windowHours * 60 * 60 * 1000;
  const recent = state.events.filter((event) => new Date(event.startedAt).getTime() >= since && new Date(event.startedAt).getTime() <= now.getTime());
  const feeds = recent.filter((event) => event.kind === "feed" && event.feedType !== "pump");
  const pumping = recent.filter((event) => event.kind === "feed" && event.feedType === "pump");
  const solidMeals = feeds.filter((event) => event.feedType === "solid");
  const amount = feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  const breastfeedingOngoing = feeds.some((event) => event.feedType === "breast" && !event.endedAt);
  const diapers = recent.filter((event) => event.kind === "diaper").length;
  const healthEvents = recent.filter((event) => event.kind === "health");
  const notes = recent.filter((event) => event.kind === "note" && event.note?.trim());
  const nextTasks = state.careTasks
    .filter((task) => !task.completedAt && new Date(task.dueAt).getTime() >= now.getTime() && new Date(task.dueAt).getTime() <= now.getTime() + 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 3);
  const sleepSegments = state.events.filter((event) => event.kind === "sleep").flatMap((event) => {
    const start = new Date(event.startedAt).getTime();
    const end = Math.min(event.endedAt ? new Date(event.endedAt).getTime() : now.getTime(), now.getTime());
    const overlap = Math.max(0, end - Math.max(start, since));
    return overlap > 0 ? [{ minutes: overlap / 60_000, ongoing: !event.endedAt }] : [];
  });
  const sleepMinutes = sleepSegments.reduce((sum, segment) => sum + segment.minutes, 0);
  const sleepOngoing = sleepSegments.some((segment) => segment.ongoing);
  const parts = [`Son ${windowHours} saatte ${recent.length} kayıt`];
  if (feeds.length) parts.push(amount ? `${amount} ml beslenme` : `${feeds.length} beslenme`);
  if (breastfeedingOngoing) parts.push("emzirme sürüyor");
  if (pumping.length) parts.push(`${pumping.length} sağım · ${pumping.reduce((sum, event) => sum + (event.amountMl ?? 0), 0)} ml stoğa eklendi`);
  if (solidMeals.length) {
    const tagged = [...new Set(solidMeals.flatMap((event) => event.allergens ?? []))];
    parts.push(`${solidMeals.length} katı öğün${tagged.length ? ` · etiketlenen: ${tagged.join(", ")}` : ""}`);
  }
  if (sleepMinutes) parts.push(`Son ${windowHours} saatte ${Math.round(sleepMinutes)} dk uyku${sleepOngoing ? " · şu anda uyuyor" : ""}`);
  if (diapers) parts.push(`${diapers} bez`);
  if (healthEvents.length) {
    const healthSummaries = healthEvents.map((event) => {
      if (event.healthType === "temperature") return `ateş ${event.temperatureC ?? "—"} °C`;
      if (event.healthType === "medicine") return `${event.medicineName || "ilaç"}${event.doseAsEntered ? ` (${event.doseAsEntered})` : ""}`;
      return `belirti${event.note ? `: ${event.note.slice(0, 70)}` : ""}`;
    });
    parts.push(`Sağlık: ${healthSummaries.join(", ")}`);
  }
  if (notes.length) parts.push(`Not: ${notes.map((event) => event.note!.trim().slice(0, 70)).join("; ")}`);
  if (nextTasks.length) parts.push(`Yaklaşan: ${nextTasks.map((task) => `${task.title} · ${new Date(task.dueAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`).join(", ")}`);
  return `${parts.join(" · ")}.`;
}
