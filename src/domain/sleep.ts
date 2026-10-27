import { AppState, Baby, CareEvent, NightWakeResponse, SleepCheckIn, SleepDayContext, SleepForecast, SleepFocus, SleepMethod, SleepPlan, SleepPlanDayRecord, SleepSupport } from "./types";
import { createMilkInventory, milkStorageLabel } from "./milk";

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
  // Corrected age applies to babies born preterm (before 37 completed weeks).
  const prematureDays = baby.gestationalWeek < 37 ? Math.max(0, 40 - baby.gestationalWeek) * 7 : 0;
  return chronological < 730 ? Math.max(0, chronological - prematureDays) : chronological;
}

export function correctedAgeMonths(baby: Baby, now = new Date()): number {
  const birthDate = new Date(`${baby.birthDate}T12:00:00`);
  if (!Number.isFinite(birthDate.getTime())) return 0;
  if (baby.gestationalWeek < 37 && ageInDays(baby.birthDate, now) < 730) {
    birthDate.setDate(birthDate.getDate() - Math.max(0, 40 - baby.gestationalWeek) * 7);
  }
  let months = (now.getFullYear() - birthDate.getFullYear()) * 12 + now.getMonth() - birthDate.getMonth();
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const anniversaryDay = Math.min(birthDate.getDate(), lastDayOfCurrentMonth);
  if (now.getDate() < anniversaryDay) months -= 1;
  return Math.max(0, months);
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

const SLEEP_DAY_CONTEXT_LABELS: Record<SleepDayContext, string> = {
  illness: "Hastalık veya rahatsızlık",
  travel: "Seyahat",
  teething: "Diş çıkarma",
  routineChange: "Düzen değişikliği"
};

export function sleepDayContextLabel(context: SleepDayContext): string {
  return SLEEP_DAY_CONTEXT_LABELS[context];
}

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
  const cutoff = now.getTime() - 30 * DAY;
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

export function createSleepForecast(baby: Baby, events: CareEvent[], now = new Date(), wakeAtOverride?: Date, dayContext?: SleepDayContext): SleepForecast {
  if (dayContext) {
    const explanations: Record<SleepDayContext, string> = {
      illness: "Bugün hastalık veya rahatsızlık işaretlendi. Uyku penceresi ve hatırlatmalar duraklatıldı; bebeğinizin ihtiyaçlarına ve sağlık uzmanınızın önerilerine göre ilerleyin.",
      travel: "Bugün seyahat işaretlendi. Olağan uyku tahmini ve hatırlatmalar duraklatıldı; bebeğinizin sinyallerine göre esnek davranın.",
      teething: "Bugün diş çıkarma işaretlendi. Olağan uyku tahmini ve hatırlatmalar duraklatıldı; bebeğinizin rahatlığına ve sinyallerine öncelik verin.",
      routineChange: "Bugün düzen değişikliği işaretlendi. Olağan uyku tahmini ve hatırlatmalar duraklatıldı; planı bebeğinizin gününe göre uyarlayın."
    };
    return { available: false, confidence: "low", explanation: explanations[dayContext] };
  }
  const age = correctedAgeDays(baby, now);
  // A parent-entered morning wake time is enough to estimate the next window
  // from the age band, even before we have any sleep history. Without that
  // explicit anchor, avoid presenting a schedule in the first nine weeks.
  if (age < 63 && !wakeAtOverride) {
    return {
      available: false,
      confidence: "low",
      explanation: "İlk 9 haftada kesin bir pencere önermiyoruz; yalnızca bebeğinizin sinyallerini ve günlük toplamları gösteriyoruz."
    };
  }

  const recentCutoff = now.getTime() - 14 * DAY;
  const lastSleep = events
    .filter((event) => {
      if (event.kind !== "sleep" || !event.endedAt) return false;
      const end = new Date(event.endedAt).getTime();
      return Number.isFinite(end) && end >= recentCutoff && end <= now.getTime();
    })
    .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime())[0];

  if (!wakeAtOverride && !lastSleep?.endedAt) {
    return {
      available: false,
      confidence: "low",
      explanation: "Tahmin için son 14 gün içinde tamamlanmış bir uyku kaydı gerekiyor."
    };
  }

  const band = wakeBandFor(baby, now);
  const personalByPart = recentAwakeWindowsByDayPart(events, now);
  const baseline = (band.min + band.max) / 2;
  const wakeAt = wakeAtOverride ?? new Date(lastSleep!.endedAt!);
  const expectedSleepBlock = new Date(wakeAt.getTime() + baseline * 60_000);
  const dayPart = dayPartFor(expectedSleepBlock);
  const personal = personalByPart[dayPart];
  const requiredSamples = dayPart === "night" ? 2 : 5;
  const hasPersonalPattern = personal.length >= requiredSamples;
  const personalMedian = median(personal);
  const blendedTarget = hasPersonalPattern ? baseline * 0.35 + personalMedian * 0.65 : baseline;
  const forecastCutoff = now.getTime() - 30 * DAY;
  const suggestionErrors = events.flatMap((event) => {
    if (event.kind !== "sleep" || !event.suggestedSleepWindowStartAt || !event.suggestedSleepWindowEndAt) return [];
    const actualStart = new Date(event.startedAt).getTime();
    const suggestedStart = new Date(event.suggestedSleepWindowStartAt).getTime();
    const suggestedEnd = new Date(event.suggestedSleepWindowEndAt).getTime();
    if (!Number.isFinite(actualStart) || !Number.isFinite(suggestedStart) || !Number.isFinite(suggestedEnd) || actualStart < forecastCutoff || actualStart > now.getTime() || suggestedEnd <= suggestedStart) return [];
    const error = (actualStart - (suggestedStart + suggestedEnd) / 2) / 60_000;
    return Math.abs(error) <= 240 ? [error] : [];
  }).slice(-10);
  const learnedOffset = suggestionErrors.length >= 3 ? median(suggestionErrors) : 0;
  const target = Math.max(band.min, Math.min(band.max, blendedTarget + learnedOffset));
  const typicalError = median(suggestionErrors);
  const errorSpread = suggestionErrors.length >= 3 ? median(suggestionErrors.map((error) => Math.abs(error - typicalError))) : 0;
  const spread = suggestionErrors.length >= 3
    ? Math.max(12, Math.min(30, Math.round(errorSpread * 1.5)))
    : hasPersonalPattern ? personal.length >= 8 ? 12 : 18 : Math.max(20, (band.max - band.min) / 2);
  const start = new Date(wakeAt.getTime() + Math.max(band.min, target - spread) * 60_000);
  const end = new Date(wakeAt.getTime() + Math.min(band.max, target + spread) * 60_000);
  const awakeMinutes = Math.max(0, Math.floor((now.getTime() - wakeAt.getTime()) / 60_000));
  if (!wakeAtOverride && awakeMinutes >= 20 * 60) {
    return { available: false, confidence: "low", awakeMinutes, explanation: "Son 20 saatte tamamlanmış uyku kaydı yok; yeni bir uyku kaydı olmadan tahmin yenilenemez." };
  }

  return {
    available: true,
    start,
    end,
    awakeMinutes,
    confidence: suggestionErrors.length >= 6 || hasPersonalPattern && personal.length >= 8 ? "high" : hasPersonalPattern || suggestionErrors.length >= 3 ? "medium" : "low",
    explanation: suggestionErrors.length >= 3
      ? `Son 30 gündeki ${suggestionErrors.length} tahmin ile gerçek uyku başlangıcı karşılaştırılarak aralık kişiselleştirildi${hasPersonalPattern ? `; ${DAY_PART_LABELS[dayPart]} uyanıklık örüntüsü de hesaba katıldı` : ""}.`
      : hasPersonalPattern
        ? `Son 30 gündeki ${DAY_PART_LABELS[dayPart]} uyanıklık kayıtlarının son ${personal.length} örneği yaş aralığıyla birlikte değerlendirildi.`
        : `${DAY_PART_LABELS[dayPart]} saat diliminde kişisel tahmin için yeterli kayıt yok (${personal.length}/${requiredSamples}); yaşa göre referans aralığı kullanılıyor.`
  };
}

export function hasSleepSinceWake(events: CareEvent[], wakeAt: Date): boolean {
  const wakeAtMs = wakeAt.getTime();
  if (!Number.isFinite(wakeAtMs)) return false;
  return events.some((event) => {
    if (event.kind !== "sleep") return false;
    const startedAt = new Date(event.startedAt).getTime();
    const endedAt = event.endedAt ? new Date(event.endedAt).getTime() : Number.NaN;
    return startedAt >= wakeAtMs || Number.isFinite(endedAt) && endedAt >= wakeAtMs;
  });
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

export type NapPatternComparison = {
  available: boolean;
  recentLoggedDays: number;
  previousLoggedDays: number;
  recentMedian: number;
  previousMedian: number;
  trend: "fewer" | "more" | "similar" | "insufficient";
};

export function compareNapPatterns(events: CareEvent[], now = new Date()): NapPatternComparison {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const recentCounts = new Map<string, number>();
  const previousCounts = new Map<string, number>();
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(midnight);
    date.setDate(date.getDate() - offset);
    const target = offset <= 7 ? recentCounts : previousCounts;
    target.set(localDayKey(date), 0);
  }
  for (const event of events) {
    if (!event.endedAt || !isDaytimeNap(event, now)) continue;
    const day = localDayKey(new Date(event.startedAt));
    if (recentCounts.has(day)) recentCounts.set(day, recentCounts.get(day)! + 1);
    if (previousCounts.has(day)) previousCounts.set(day, previousCounts.get(day)! + 1);
  }
  const recent = [...recentCounts.values()].filter((count) => count > 0);
  const previous = [...previousCounts.values()].filter((count) => count > 0);
  if (recent.length < 4 || previous.length < 4) {
    return { available: false, recentLoggedDays: recent.length, previousLoggedDays: previous.length, recentMedian: 0, previousMedian: 0, trend: "insufficient" };
  }
  const recentMedian = median(recent)!;
  const previousMedian = median(previous)!;
  const trend = recentMedian <= previousMedian - 1 ? "fewer" : recentMedian >= previousMedian + 1 ? "more" : "similar";
  return { available: true, recentLoggedDays: recent.length, previousLoggedDays: previous.length, recentMedian, previousMedian, trend };
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

export function isSleepPlanPausedToday(plan: Pick<SleepPlan, "paused" | "checkIns">, date: string): boolean {
  return plan.paused || Boolean(plan.checkIns.find((checkIn) => checkIn.date === date)?.dayContext);
}

const METHOD_COPY: Record<SleepMethod, { name: string; support: string; caregiverRole: string; nightResponse: string; comparison: { protest: string; presence: string; effort: string; pace: string } }> = {
  responsive: { name: "Duyarlı rutin", support: "Ağlamaya hızlı yanıt vererek uyku işaretlerini ve tutarlı rutini güçlendirir.", caregiverRole: "Bebeğinizin yanında kalın; ses, dokunuş veya kucak desteğini ihtiyacına göre kullanın.", nightResponse: "Uyanınca açlık, bez, rahatsızlık ve yakınlık ihtiyacını kontrol edip gecikmeden yanıt verin.", comparison: { protest: "Azalması hedeflenir; her işarete yanıt verilir", presence: "Yakın ve sürekli", effort: "Düzenli, esnek katılım", pace: "Bebeğin sinyallerine göre" } },
  gradual: { name: "Kademeli destek", support: "Her birkaç gecede yardımı küçük adımlarla azaltır; katı bir süre tutmaz.", caregiverRole: "Yalnızca tek bir desteği, bebek ve aile rahat olduğunda daha az yoğun sunmayı deneyin.", nightResponse: "Huzursuzluk belirgin artarsa denemeyi bırakın, önceki desteğe dönüp sakinleştirin.", comparison: { protest: "Değişebilir; artarsa desteğe dönülür", presence: "Yakında, destek sürer", effort: "Orta; küçük adımlar izlenir", pace: "Aile ve bebeğe göre" } },
  timedChecks: { name: "Önceden kararlaştırılmış kısa kontroller", support: "Bakım veren, bebeğin temel ihtiyaçları karşılanmış ve sakin olduğu sürece, ailece önceden seçilen aralıklarla kısa ve sakin kontroller yapar. Uykuva ağlama süresi veya sabit aralık önermez.", caregiverRole: "Diğer bakım verenle kimin ne zaman kontrol edeceğini önceden konuşun. Kontrol sırasında kısa ses ve yakınlık desteği verin; planı istediğiniz an bırakabilirsiniz.", nightResponse: "Açlık, bez, ağrı, hastalık, yoğun ağlama veya farklı bir ihtiyaç varsa süreyi beklemeden yanıt verin. Zorlanırsanız bu yaklaşımı durdurup daha fazla destek verin.", comparison: { protest: "Olabilir; düzeyi ve süresi değişir", presence: "Önceden konuşulan kısa kontroller", effort: "Bakım verenler arası planlama", pace: "Ailenin belirlediği; sabit süre yok" } },
  camping: { name: "Yakında kalma", support: "Bakım veren odada kalır ve desteğini günler içinde yavaşça azaltır.", caregiverRole: "Uyku alanının yanında kalıp sesinizle veya nazik dokunuşla destek olun; mesafeyi artırmak zorunlu değildir.", nightResponse: "Bebeğiniz sizi aradığında yakınlığınızı sürdürün ve ihtiyacına yanıt verin.", comparison: { protest: "Değişebilir; bakım veren yakındadır", presence: "Oda içinde sürekli", effort: "Yüksek; yakın katılım", pace: "Yavaş ve küçük adımlı" } },
  bedtimeFading: { name: "Yatma saatini ayarlama", support: "Yatma saatini kayıtlı uykuya dalma örüntüsüne yaklaştırıp, rahat ilerledikçe küçük adımlarla erkene alır.", caregiverRole: "Uyku ve yatış saatlerini kaydedin; önerilen değişim küçük ve ailece sürdürülebilir olsun.", nightResponse: "Gece bakımında beslenme veya rahatlatma ihtiyacını saat ayarından bağımsız karşılayın.", comparison: { protest: "Değişebilir; rutini bebeğe göre ayarlayın", presence: "Yatma rutini boyunca yakın", effort: "Saatleri kaydetme ve gözden geçirme", pace: "Küçük saat ayarlarıyla" } },
  pickUpPutDown: { name: "Al, sakinleştir, tekrar yatır", support: "Huzursuzlukta bebeği sakinleştirir; rahatlayınca güvenli uyku alanına geri yatırıp gerektiğinde tekrar destek verirsiniz.", caregiverRole: "Sakinleşene kadar kucağınızda destek olun; rahatlayınca bebeği güvenli uyku alanına sırtüstü yatırın.", nightResponse: "Ağlama sürerse tekrar destek verin; bu yaklaşımda tekrar tekrar yanıt vermek beklenir.", comparison: { protest: "Değişebilir; her huzursuzlukta yanıt verilir", presence: "Çok yakın, fiziksel destek", effort: "Yüksek; sık tekrar gerekebilir", pace: "Bebeğin sakinleşmesine göre" } },
  routineFirst: { name: "Önce tutarlı rutin", support: "Uyku öncesi kısa ve tekrarlanabilir sakin adımlara odaklanır; desteği azaltma hedefi koymaz.", caregiverRole: "Ailenize uyan birkaç sakin adımı benzer sırayla uygulayın ve ihtiyaç duyulan desteği koruyun.", nightResponse: "Gece uyanmalarında temel ihtiyaçlara ve bebeğinizin işaretlerine göre olağan desteği sürdürün.", comparison: { protest: "Azaltma hedefi yok; ihtiyaca yanıt verilir", presence: "Yakın ve destekleyici", effort: "Orta; rutin tutarlılığı", pace: "Esnek; hedef aileye bağlı" } }
};

export function methodDescription(method: SleepMethod) {
  return METHOD_COPY[method];
}

export const SLEEP_SUPPORT_OPTIONS: { id: SleepSupport; label: string }[] = [
  { id: "feeding", label: "Beslenerek" },
  { id: "held", label: "Kucakta" },
  { id: "rocked", label: "Sallanarak" },
  { id: "nearby", label: "Yanında kalınarak" },
  { id: "cribSupport", label: "Beşikte destekle" },
  { id: "independent", label: "Kendi kendine" },
  { id: "other", label: "Diğer" }
];

export function sleepSupportLabel(support: SleepSupport): string {
  return SLEEP_SUPPORT_OPTIONS.find((item) => item.id === support)?.label ?? "Diğer";
}

export const NIGHT_WAKE_RESPONSE_OPTIONS: { id: NightWakeResponse; label: string }[] = [
  { id: "feeding", label: "Beslenme" },
  { id: "comfort", label: "Sakinleştirme / yakınlık" },
  { id: "diaper", label: "Bez / temel ihtiyaç" },
  { id: "other", label: "Diğer" }
];

export function nightWakeResponseLabel(response: NightWakeResponse): string {
  return NIGHT_WAKE_RESPONSE_OPTIONS.find((item) => item.id === response)?.label ?? "Diğer";
}

export function coachingDay(day: number, method: SleepMethod, canReduceSupport = true, correctedAge = 183, focus: SleepFocus = "routine"): CoachingDay {
  const safeDay = Math.min(14, Math.max(1, day));
  if (!canReduceSupport) {
    const isYoungInfant = correctedAge < 112;
    const foundations: CoachingDay[] = isYoungInfant ? [
      { title: "1. gün · Gündüz ve geceyi ayırt et", focus: "Ritmi gözlemle", tasks: ["Gündüz olağan ev ışığı ve sesleriyle yaşa uygun etkileşim sun", "Gece bakımını loş ve sakin tut", "Uyku başlangıç ve bitişlerini kaydet"], checkIn: "Gündüz ile gece bakımının farklılaşması aileniz için nasıl hissettirdi?" },
      { title: "2. gün · Sabah ışığı", focus: "Güne sakin başlangıç", tasks: ["Sabah uyanışından sonra gündüz ışığına ve olağan etkinliklere yer ver", "Bebeğin uykulu olma işaretlerini gözlemle", "Her uykuda güvenli uyku alanını kullan"], checkIn: "Bebeğinizin uykulu olduğunu hangi işaretlerden anladınız?" },
      { title: "3. gün · İşaretleri tanı", focus: "Bebeğin sinyallerini izle", tasks: ["Esneme, bakışı kaçırma veya huzursuzluk gibi kendi gözlemlerinizi not edin", "İşaret gördüğünüzde ortamı yumuşatın", "Kesin saat hedefi koymadan bebeğin tepkisini izleyin"], checkIn: "Bugün hangi uyku işaretini daha erken fark ettiniz?" },
      { title: "4. gün · Gece uyanmaları", focus: "Duyarlı yanıt", tasks: ["Uyanınca önce bebeğinizin temel ihtiyacını ve durumunu kontrol edin", "Beslenme ve yakınlık ihtiyacına bebeğin işaretlerine göre yanıt verin", "Gece ortamını sakin ve loş tutun"], checkIn: "Gece bakımında hangi sakinleştirme biçimi size yardımcı oldu?" },
      { title: "5. gün · Güvenli uyku", focus: "Her uykuda güvenlik", tasks: ["Bebeği her uykuya sırtüstü yatırın", "Uyku alanında sert, düz yüzey ve gergin çarşaf bulunduğunu kontrol edin", "Yastık, yorgan, oyuncak ve gevşek örtüleri uyku alanından çıkarın"], checkIn: "Uyku alanında değiştirmek istediğiniz bir şey fark ettiniz mi?" },
      { title: "6. gün · Kısa sakinleşme sırası", focus: "Esnek bir akşam", tasks: ["Işıkları azaltma veya kısa ninni gibi tek sakin adım deneyin", "Bebeğin tepkisine göre rutini kısaltın ya da atlayın", "Sakinleşmek için ihtiyaç duyduğu desteği verin"], checkIn: "Kısa bir akşam adımı bebeğinizin sakinleşmesine yardımcı oldu mu?" },
      { title: "7. gün · İlk haftayı gözden geçir", focus: "Beklenti değil gözlem", tasks: ["Son haftadaki uyku ve uyanıklık kayıtlarını gözden geçirin", "Tek bir farklı geceyi sorun veya gerileme olarak yorumlamayın", "İşe yarayan bir bakım adımını sürdürün"], checkIn: "Aileniz için en kolay ve en zor uyku anı hangisiydi?" },
      { title: "8. gün · Gündüz uykuları", focus: "Esnek destek", tasks: ["Gündüz uykusu öncesinde bebeğinizin yorgunluk işaretlerini izleyin", "Kısa uykular olduğunda bir sonraki uykuya esnek yaklaşın", "Bebeğinizin ihtiyacına göre destek verin"], checkIn: "Gündüz uykusunda hangi işaret veya rutin size yol gösterdi?" },
      { title: "9. gün · Bakım verenler", focus: "Ortak yaklaşım", tasks: ["Bakım verenle bebeği sakinleştiren yöntemleri paylaşın", "Beslenme ve sağlıkla ilgili bakım talimatlarını aynen devredin", "Kendi dinlenme molanızı planlayın"], checkIn: "Bakım devrinde hangi bilgi en yararlı oldu?" },
      { title: "10. gün · Sakin ses ve yakınlık", focus: "İhtiyaca yanıt", tasks: ["Bebeğinizin huzursuzluk işaretlerine erken yanıt verin", "Ses, nazik dokunuş veya kucak desteğinden bebeğinize uygun olanı deneyin", "Huzursuzluk artarsa daha fazla destek sunun"], checkIn: "Bebeğiniz hangi sakinleştirme desteğine daha iyi yanıt verdi?" },
      { title: "11. gün · Gece bakımını kolaylaştır", focus: "Hazırlıklı ol", tasks: ["Güvenli uyku alanını yatmadan önce hazırlayın", "Gece bakımında gereken malzemeleri erişilebilir tutun", "Gece beslenmesi ve yakınlık ihtiyacına yanıt vermeyi sürdürün"], checkIn: "Gece bakımını kolaylaştırmak için neyi önceden hazırladınız?" },
      { title: "12. gün · İşe yarayanı tekrarla", focus: "Nazik tekrar", tasks: ["Ailenize yardımcı olan sakin akşam adımını yineleyin", "Bebeğinizin tepkisine göre rutini esnetin", "Yeni bir uyku yöntemi veya destek azaltma hedefi eklemeyin"], checkIn: "Tekrarladığınız adım bugün de işe yaradı mı?" },
      { title: "13. gün · Kendinize de alan açın", focus: "Bakım verenin iyilik hâli", tasks: ["Mümkünse bakım görevini kısa süreli paylaşın", "Yardım istemek veya rutini sadeleştirmek için kendinize izin verin", "Bebeğinizin ihtiyacına duyarlı biçimde yanıt verin"], checkIn: "Bugün sizin dinlenmenize ne yardımcı oldu?" },
      { title: "14. gün · Ritim temellerini gözden geçir", focus: "Esnek devam", tasks: ["Son iki haftadan ailenize uyan rutinleri seçin", "Bebeğinizin gelişimiyle birlikte ihtiyaçların değişebileceğini hatırlayın", "Uyku, beslenme veya sağlık endişelerinizi çocuk doktoruyla konuşun"], checkIn: "Önümüzdeki hafta sürdürmek istediğiniz bir adım nedir?" }
    ] : [
      { title: "1. gün · Mevcut ritmi gözle", focus: "Önce temel çizgi", tasks: ["Uyku başlangıç ve bitiş saatlerini kaydet", "Bu hafta mevcut sakinleştirme desteğini değiştirme", "Bakım verenlerle uyku ve beslenme planını konuş"], checkIn: "Şu an yatma rutininin en kolay ve en zor bölümü hangisi?" },
      { title: "2. gün · Sabah başlangıcı", focus: "Öngörülebilir sabah", tasks: ["Sabahı ailenizin yaşamına uyan benzer bir aralıkta başlat", "Uyanınca gündüz ışığı ve olağan etkinliklere yer ver", "Uyku saatlerini kaydetmeye devam et"], checkIn: "Benzer bir sabah başlangıcı bugünkü ritme nasıl yansıdı?" },
      { title: "3. gün · Akşamı yumuşat", focus: "Düşük uyarımlı geçiş", tasks: ["Yatmaya yakın ortamı ve etkinlikleri sakinleştir", "Yatma rutininde kısa ve tekrarlanabilir bir sıra belirle", "Bebeğin yorgunluk işaretlerini izle"], checkIn: "Sakin geçiş için hangi adım uygulanabilir geldi?" },
      { title: "4. gün · Rutini aynı sırayla dene", focus: "Tanıdık ipuçları", tasks: ["Akşam adımlarını benzer sırayla uygula", "Rutin sırasında bebeğine eşlik et ve gerekirse destek ver", "Rutin çok uzarsa basitleştir"], checkIn: "Rutinin hangi bölümü bebeğinize tanıdık gelmeye başladı?" },
      { title: "5. gün · Uyku işaretlerine bak", focus: "Saate değil bebeğe göre", tasks: ["Uyku yaklaşırken bebeğinizin davranışlarını gözlemle", "İşaretlere göre rutinin başlangıcını ayarla", "Bebeğiniz rahatsızsa rutine ara ver"], checkIn: "Bebeğinizin uykuya hazır olduğunu nasıl anladınız?" },
      { title: "6. gün · Bir sakin işaret seç", focus: "Basit tekrar", tasks: ["Ninni, kısa kitap veya loş ışık gibi bir işaret seç", "Bu işareti rutin içinde tekrar kullan", "Bebeğinizin istediği desteği azaltmaya çalışma"], checkIn: "Seçtiğiniz sakin işaret rutine uydu mu?" },
      { title: "7. gün · İlk haftayı gözden geçir", focus: "Küçük kazanımları fark et", tasks: ["Son haftada işe yarayan rutin adımını belirle", "Uykuya geçiş kolaylığını isteğe bağlı olarak kaydet", "Bir zor geceyi başarısızlık olarak görme"], checkIn: "Aynı kalmasını istediğiniz bir rutin adımı var mı?" },
      { title: "8. gün · Rutini koru", focus: "Tutarlılık", tasks: ["İşe yarayan rutini benzer sırayla uygula", "Gündüz uykularını ve uyanışları kaydet", "Bebeğin sinyallerine göre destek ver"], checkIn: "Rutini sürdürmek bu hafta ne kadar kolay oldu?" },
      { title: "9. gün · Bakım devri", focus: "Herkes aynı bilgide", tasks: ["Diğer bakım verene akşam rutinini paylaş", "Bebeğin uyku ve beslenme işaretlerini aktar", "Aynı destek adımlarını uygulayıp uygulamadığınızı konuş"], checkIn: "Bakım verenler arasında netleştirmek istediğiniz bir şey kaldı mı?" },
      { title: "10. gün · Rutin süresini ayarla", focus: "Yeterince kısa ve sakin", tasks: ["Akşam rutinini bebeğinizin ihtiyacına göre kısa tut", "Yatma öncesi aşırı uyarıcı etkinlikleri azalt", "Bebeğiniz huzursuzsa rahatlatmaya öncelik ver"], checkIn: "Daha kısa bir rutin yatma geçişini kolaylaştırdı mı?" },
      { title: "11. gün · Veriye bak, esnek kal", focus: "Kayıtları bağlamda oku", tasks: ["Son birkaç günün uyku kayıtlarına birlikte bak", "Eksik kayıtların örüntüyü değiştirebileceğini hesaba kat", "Tek bir saate bağlı katı program kurma"], checkIn: "Kayıtlarınızda tekrar eden ama kesin olmayan bir örüntü gördünüz mü?" },
      { title: "12. gün · Destek vermeye devam", focus: "Bebeğin tepkisi öncelikli", tasks: ["Bebeğinize iyi gelen desteği sürdür", "Yoğun huzursuzlukta desteği azaltma adımını bırak", "Beslenme ihtiyacını uyku planından ayrı değerlendir"], checkIn: "Bugün bebeğinizin işaretleri bakımınızı nasıl yönlendirdi?" },
      { title: "13. gün · Aileye uyan biçimi seç", focus: "Sürdürülebilir rutin", tasks: ["Gerçek yaşamınızda sürdürebildiğiniz adımları belirle", "Gerekirse rutini daha kısa ve basit hâle getir", "Bakım verenlerle değişiklikleri önceden konuş"], checkIn: "Sürdürülebilir bulduğunuz rutin nasıl görünüyor?" },
      { title: "14. gün · Hazırlık dönemini gözden geçir", focus: "Sonraki adım aileye bağlı", tasks: ["İki haftalık uyku ve rutin kayıtlarını gözden geçir", "Hazır değilseniz destek azaltma adımını ertele", "Sağlık veya beslenme endişesinde çocuk doktorunuza danış"], checkIn: "Hazırlık döneminden hangi alışkanlığı sürdürmek istersiniz?" }
    ];
    const item = foundations[safeDay - 1]!;
    return { ...item, title: item.title.replace(/^\d+/, String(safeDay)) };
  }

  const phase = safeDay <= 3 ? "observe" : safeDay <= 7 ? "routine" : safeDay <= 10 ? "practice" : "consolidate";
  const shared: Record<typeof phase, string[]> = {
    observe: ["Bugün uyku başlangıç ve bitişlerini kaydet", "Mevcut sakinleştirme desteğini değiştirme", "Ailedeki bakım verenlerle aynı hedefi konuş"],
    routine: ["Akşam adımlarını benzer sırayla uygula", "Bebeğinin uyku işaretlerine göre rutini başlat", "Bu hafta yalnızca bir küçük değişikliği değerlendirmeye al"],
    practice: ["Seçtiğin yaklaşımı yalnızca yatma rutininin bir bölümünde dene", "Huzursuzluk artarsa önceki desteğe dön", "Beslenme, hastalık ve rahatlık ihtiyacını geciktirme"],
    consolidate: ["İşe yarayan destek adımlarını aynı biçimde sürdür", "Yeni bir azaltma adımı eklemeden önce birkaç gece gözlemle", "Bakım verenlerle check-in sonuçlarını paylaş"]
  };
  const phaseNames = { observe: "Ritmi gözle", routine: "Rutini kur", practice: "Nazikçe dene", consolidate: "İşe yarayanı koru" };
  const methodTasks: Record<SleepMethod, Record<typeof phase, string[]>> = {
    responsive: {
      observe: ["Bebeğinizin hangi ses veya yakınlık desteğine yanıt verdiğini not edin", "Uyanınca temel ihtiyaçlarına göre karşılık verin"],
      routine: ["İlk huzursuzlukta sesinizle veya yakınlığınızla yanıt verin", "Gerekirse kucağa alıp sakinleşince yatağa geri dönün"],
      practice: ["Gündüz veya gece uykusunda aynı sakinleştirme ipucunu deneyin", "Daha fazla desteğe ihtiyaç duyarsa desteği artırın"],
      consolidate: ["Bebeğinize iyi gelen yanıt biçimini sürdürün", "Bakım verenlerle hangi desteğin işe yaradığını paylaşın"]
    },
    gradual: {
      observe: ["Uykuya geçişte en çok hangi desteği kullandığınızı belirleyin", "Bu aşamada desteği değiştirmeden bebeğinizin tepkisini izleyin"],
      routine: ["Yalnızca tek bir destek adımını daha az yoğun sunmayı değerlendirin", "Bebeğiniz rahatsız olursa önceki desteğe dönün"],
      practice: ["Seçtiğiniz küçük değişikliği yalnızca rahat bir anda deneyin", "Belirgin huzursuzlukta denemeyi bırakıp sakinleştirin"],
      consolidate: ["Aile için sürdürülebilir olan destek düzeyini koruyun", "Yeni bir adımı ancak önceki adım rahat geçtiyse düşünün"]
    },
    timedChecks: {
      observe: ["Bakım verenlerle gece yanıtını ve durdurma işaretlerini önceden konuşun", "Bebeğinizin ihtiyacına göre verdiğiniz desteği değiştirmeden gözlemleyin"],
      routine: ["Kısa, sakin ve tutarlı bir yatma rutini uygulayın", "Beslenme ve sağlık ihtiyaçlarının her zaman öncelikli olduğunu bakım verenlerle netleştirin"],
      practice: ["Yalnızca herkes hazırsa, ailece belirlenen kısa kontrol düzenini deneyin", "Bebeğiniz veya siz zorlanırsanız süreyi beklemeden kontrol edip daha fazla destek verin"],
      consolidate: ["Bu yaklaşımın aileye ve bebeğinize uygun olup olmadığını birlikte değerlendirin", "Uygun değilse durdurup duyarlı rutine veya daha fazla desteğe dönün"]
    },
    camping: {
      observe: ["Bebeğinizin yanında hangi sakin desteği verdiğinizi gözlemleyin", "Bakım verenlerin gece için ortak bir yanıt belirlemesini sağlayın"],
      routine: ["Yatağın yanında kalıp sesinizle veya nazik dokunuşla destek verin", "Yakınlığınızı azaltmak zorunda değilsiniz"],
      practice: ["Birkaç rahat geçiş olduysa yalnızca küçük bir mesafe değişikliğini deneyin", "Bebeğiniz sizi ararsa yaklaşıp ihtiyacına yanıt verin"],
      consolidate: ["Bebeğiniz ve aileniz için rahat olan yakınlığı sürdürün", "Mesafeyi artırmayı istemiyorsanız mevcut şekilde devam edin"]
    },
    bedtimeFading: {
      observe: ["Son yatış ve uyku başlangıçlarını gözden geçirin", "Saat değişikliği yapmadan uykuya geçiş kolaylığını kaydedin"],
      routine: ["Akşam rutinini son günlerdeki gerçek uykuya dalma zamanına göre planlayın", "Yeterli kayıt yoksa hedef saati değiştirmeyin"],
      practice: ["Uykuya geçiş sürekli zorlanıyorsa hedef saati küçük bir adımla ayarlamayı değerlendirin", "Bebeğiniz daha yorgun veya huzursuz görünürse önceki düzene dönün"],
      consolidate: ["Rahat uykuya geçiş saatini birkaç gece gözlemleyin", "Saat hedefini yalnızca aileye ve bebeğe iyi geliyorsa yeniden ayarlayın"]
    },
    pickUpPutDown: {
      observe: ["Bebeğinizin hangi durumda kucak desteğine ihtiyaç duyduğunu fark edin", "Uyku alanını güvenli ve hazır tutun"],
      routine: ["Uyku öncesi sakinleştirme sırasını belirleyin", "Bebeğiniz sakinse yatağında sesinizle destek verin"],
      practice: ["Belirgin huzursuzlukta kucağa alıp sakinleşmesine yardım edin", "Rahatlayınca sırtüstü güvenli uyku alanına geri yatırın"],
      consolidate: ["Gerekirse aynı alıp sakinleştirme döngüsünü tekrarlayın", "Bebeğiniz veya siz yorulursanız daha fazla destek verip ara verin"]
    },
    routineFirst: {
      observe: ["Akşamı kolaylaştıran veya zorlaştıran adımları not edin", "Mevcut rutini değiştirmeden izleyin"],
      routine: ["İki veya üç kısa, sakin adımı benzer sırayla uygulayın", "Uyku işaretlerine göre rutini kısaltın veya ara verin"],
      practice: ["Bebeğinizin sevdiği bir kitap, ninni veya loş ışık ipucunu tekrarlayın", "Uykuya geçişte ihtiyaç duyduğu desteği verin"],
      consolidate: ["Aileniz için uygulanabilir rutin adımlarını seçin", "Desteği azaltma hedefi koymadan bu sırayı sürdürün"]
    }
  };
  const focusTasks: Record<SleepFocus, Record<typeof phase, string>> = {
    bedtime: {
      observe: "Yatma zamanında zorlayan adımı not edin; saati hemen değiştirmeyin.",
      routine: "Akşam rutinini bebeğinizin uyku işaretlerine göre başlatın.",
      practice: "Uykuya geçiş sürekli zor geliyorsa hedef saati küçük bir adımla ayarlamayı değerlendirin.",
      consolidate: "Rahat geçen yatış saatlerini birkaç gece izleyip sürdürülebilir hedefi seçin."
    },
    nightWakings: {
      observe: "Gece uyanmalarını ve verdiğiniz yanıtları not edin; beslenme ihtiyacını plana göre ertelemeyin.",
      routine: "Gece bakımını sakin ve loş tutun; her uyanmada temel ihtiyaçları değerlendirin.",
      practice: "Bebeğiniz uyandığında önce ihtiyacını kontrol edip seçtiğiniz nazik destekle yanıt verin.",
      consolidate: "İşe yarayan gece yanıtını koruyun; beslenme ve sağlık ihtiyaçlarını ayrı değerlendirin."
    },
    naps: {
      observe: "Gündüz uykularının başlangıç ve bitişlerini, eksik kayıtları da hesaba katarak izleyin.",
      routine: "Gündüz uykusundan önce kısa ve tanıdık bir sakinleşme ipucu deneyin.",
      practice: "Bir gündüz uykusunda seçtiğiniz desteği deneyin; huzursuzlukta daha fazla destek verin.",
      consolidate: "Bebeğiniz için kolay geçen gündüz uykusu adımlarını sürdürün."
    },
    routine: {
      observe: "Akşamın kolay ve zor adımlarını kaydedin; henüz değişiklik yapmak zorunda değilsiniz.",
      routine: "İki veya üç sakin adımı benzer sırayla tekrarlayın.",
      practice: "Bebeğinizin işaretlerine göre rutini kısaltın, tekrarlayın veya ara verin.",
      consolidate: "Aileniz için uygulanabilir olan rutin sırasını koruyun."
    }
  };
  const focusQuestions: Record<SleepFocus, string> = {
    bedtime: "Yatma saatine geçiş bugün nasıl hissettirdi?",
    nightWakings: "Gece uyanmalarında bebeğiniz hangi desteğe yanıt verdi?",
    naps: "Gündüz uykularından hangisinde bebeğinizin işaretleri yol gösterdi?",
    routine: "Akşam rutininin hangi adımı ailenize daha uygun geldi?"
  };
  return {
    title: `${safeDay}. gün · ${METHOD_COPY[method].name}`,
    focus: phaseNames[phase],
    tasks: [...shared[phase], ...methodTasks[method][phase], focusTasks[focus][phase]],
    checkIn: focusQuestions[focus]
  };
}

export type SleepPlanCheckInComparison = {
  available: boolean;
  firstDays: number;
  recentDays: number;
  firstEaseAverage?: number;
  recentEaseAverage?: number;
  firstEaseCount: number;
  recentEaseCount: number;
  firstWakingsAverage?: number;
  recentWakingsAverage?: number;
  firstWakingsCount: number;
  recentWakingsCount: number;
  firstCappedWakings: number;
  recentCappedWakings: number;
};

export type SleepCoachGuidance = {
  title: string;
  body: string;
  tone: "peach" | "mint";
};

export function createSleepCoachGuidance(checkIns: SleepCheckIn[], now = new Date()): SleepCoachGuidance | undefined {
  const today = localDayKey(now);
  const recent = checkIns
    .filter((item) => item.date <= today && item.date >= localDayKey(new Date(now.getTime() - 2 * DAY)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const latest = recent[0];
  if (!latest) return undefined;
  if (latest.nightWakings === 5) return {
    title: "Sık uyanma bildirildi",
    body: "Önce açlık, bez, rahatsızlık ve yakınlık ihtiyacını değerlendirin; beslenmeyi plana göre ertelemeyin. Bu gece destek azaltma adımını atlamakta özgürsünüz.",
    tone: "peach"
  };
  const difficultNights = recent.filter((item) => item.ease !== undefined && item.ease <= 2).length;
  if (difficultNights >= 2) return {
    title: "Bu gece adımları yumuşatabilirsiniz",
    body: `Son ${recent.length} check-in'in ${difficultNights} tanesi zor olarak işaretlendi. Yeni bir destek azaltma adımı denemek zorunda değilsiniz; işe yarayan desteği sürdürün veya planı duraklatın.`,
    tone: "peach"
  };
  if (latest.ease !== undefined && latest.ease <= 2) return {
    title: "Son gece zor geçmiş",
    body: "Bu gece rutini sadeleştirin ve bebeğinizin ihtiyacına göre daha fazla destek verin. Tek bir zor gece planı hızlandırmak veya bebeği daha az desteklemek gerektiği anlamına gelmez.",
    tone: "peach"
  };
  const easierNights = recent.filter((item) => item.ease !== undefined && item.ease >= 4).length;
  if (easierNights >= 2) return {
    title: "İşe yarayan rutini koruyun",
    body: `Son ${recent.length} check-in'in ${easierNights} tanesi daha kolay olarak işaretlendi. Aynı yaklaşımı sürdürün; daha az destek vermek zorunlu değildir.`,
    tone: "mint"
  };
  return undefined;
}

export function compareSleepPlanCheckIns(records: SleepPlanDayRecord[], checkIns: SleepCheckIn[], method: SleepMethod, focus: SleepFocus): SleepPlanCheckInComparison {
  const matchingDays = records
    .filter((record) => record.method === method && record.focus === focus)
    .sort((a, b) => a.day - b.day || a.date.localeCompare(b.date));
  if (matchingDays.length < 6) {
    return {
      available: false,
      firstDays: Math.min(3, matchingDays.length),
      recentDays: Math.min(3, matchingDays.length),
      firstEaseCount: 0,
      recentEaseCount: 0,
      firstWakingsCount: 0,
      recentWakingsCount: 0,
      firstCappedWakings: 0,
      recentCappedWakings: 0
    };
  }

  const firstRecords = matchingDays.slice(0, 3);
  const recentRecords = matchingDays.slice(-3);
  const checkInsByDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));
  const summarize = (days: SleepPlanDayRecord[]) => {
    const logs = days.map((day) => checkInsByDate.get(day.date)).filter((item): item is SleepCheckIn => Boolean(item));
    const easeValues = logs.flatMap((item) => item.ease === undefined ? [] : [item.ease]);
    const uncappedWakingValues = logs.flatMap((item) => item.nightWakings === undefined || item.nightWakings >= 5 ? [] : [item.nightWakings]);
    const cappedWakings = logs.filter((item) => item.nightWakings === 5).length;
    return {
      easeAverage: easeValues.length >= 2 ? easeValues.reduce((sum, value) => sum + value, 0) / easeValues.length : undefined,
      easeCount: easeValues.length,
      wakingsAverage: uncappedWakingValues.length >= 2 ? uncappedWakingValues.reduce((sum, value) => sum + value, 0) / uncappedWakingValues.length : undefined,
      wakingsCount: uncappedWakingValues.length,
      cappedWakings
    };
  };
  const first = summarize(firstRecords);
  const recent = summarize(recentRecords);
  return {
    available: true,
    firstDays: firstRecords.length,
    recentDays: recentRecords.length,
    firstEaseAverage: first.easeAverage,
    recentEaseAverage: recent.easeAverage,
    firstEaseCount: first.easeCount,
    recentEaseCount: recent.easeCount,
    firstWakingsAverage: first.wakingsAverage,
    recentWakingsAverage: recent.wakingsAverage,
    firstWakingsCount: first.wakingsCount,
    recentWakingsCount: recent.wakingsCount,
    firstCappedWakings: first.cappedWakings,
    recentCappedWakings: recent.cappedWakings
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
  routineToSleepMedianMinutes?: number;
  routineToSleepSamples: number;
  sleepSupportSummary?: string;
  sleepSupportSamples: number;
  nightsUsed: number;
};

export type NightSleepSummary = { minutes: number; segments: number; hasExactWindow: boolean };

export function summarizeNightSleep(events: CareEvent[], checkIn?: Pick<SleepCheckIn, "date" | "bedtime" | "wakeTime">, now = new Date()): NightSleepSummary {
  const date = checkIn?.date && /^\d{4}-\d{2}-\d{2}$/.test(checkIn.date) ? checkIn.date : localDayKey(now);
  const morning = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(morning.getTime())) return { minutes: 0, segments: 0, hasExactWindow: false };
  const startMinutes = checkIn?.bedtime ? clockMinutes(checkIn.bedtime) : null;
  const endMinutes = checkIn?.wakeTime ? clockMinutes(checkIn.wakeTime) : null;
  const start = new Date(morning);
  start.setDate(start.getDate() - 1);
  start.setHours(Math.floor((startMinutes ?? 18 * 60) / 60), (startMinutes ?? 18 * 60) % 60, 0, 0);
  const end = new Date(morning);
  end.setHours(Math.floor((endMinutes ?? 12 * 60) / 60), (endMinutes ?? 12 * 60) % 60, 0, 0);
  const endMs = Math.min(end.getTime(), now.getTime());
  if (endMs <= start.getTime()) return { minutes: 0, segments: 0, hasExactWindow: Boolean(startMinutes !== null && endMinutes !== null) };
  const intervals = events.flatMap((event) => {
    if (event.kind !== "sleep") return [];
    const sleepStart = new Date(event.startedAt).getTime();
    const sleepEnd = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime();
    const from = Math.max(start.getTime(), sleepStart);
    const to = Math.min(endMs, sleepEnd);
    return Number.isFinite(from) && Number.isFinite(to) && to > from ? [{ from, to }] : [];
  }).sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.from <= last.to) last.to = Math.max(last.to, interval.to);
    else merged.push({ ...interval });
  }
  const minutes = Math.round(merged.reduce((sum, interval) => sum + interval.to - interval.from, 0) / 60_000);
  return { minutes, segments: merged.length, hasExactWindow: startMinutes !== null && endMinutes !== null };
}

export function createSleepCoachInsights(events: CareEvent[], targetBedtime: string, checkIns: { date?: string; ease?: number; nightWakings?: number; bedtime?: string }[], now = new Date()): SleepCoachInsights {
  const target = clockMinutes(targetBedtime) ?? 20 * 60;
  const cutoff = now.getTime() - 30 * DAY;
  const nightStarts = events
    .filter((event) => {
      if (event.kind !== "sleep" || !event.endedAt) return false;
      const start = new Date(event.startedAt);
      if (start.getTime() < cutoff || start.getTime() > now.getTime()) return false;
      const duration = (new Date(event.endedAt).getTime() - start.getTime()) / 60_000;
      return start.getHours() >= 17 && duration >= 120;
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 7)
    .map((event) => {
      const date = new Date(event.startedAt);
      return date.getHours() * 60 + date.getMinutes();
    });
  const recentCheckIns = checkIns
    .filter((item) => typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.date >= localDayKey(new Date(cutoff)) && item.date <= localDayKey(now))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 7);
  const checkInBedtimes = recentCheckIns.flatMap((item) => {
    if (!item.bedtime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.bedtime)) return [];
    const [hour, minute] = item.bedtime.split(":").map(Number);
    return [hour! * 60 + minute!];
  });
  const bedtimeSample = nightStarts.length >= 3 || !checkInBedtimes.length ? nightStarts : checkInBedtimes;
  const actual = bedtimeSample.length ? median(bedtimeSample) : undefined;
  const routineEvents = events
    .filter((event) => event.kind === "note" && event.endedAt && event.note?.startsWith("Akşam rutini tamamlandı"))
    .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime());
  const nightSleepEvents = events
    .filter((event) => {
      if (event.kind !== "sleep") return false;
      const start = new Date(event.startedAt);
      if (start.getTime() < cutoff || start.getTime() > now.getTime()) return false;
      if (start.getHours() < 17) return false;
      return !event.endedAt || (new Date(event.endedAt).getTime() - start.getTime()) / 60_000 >= 120;
    })
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const matchedSleepIds = new Set<string>();
  const routineLatencies: number[] = [];
  for (const routine of routineEvents) {
    const routineEnd = new Date(routine.endedAt!).getTime();
    const sleep = nightSleepEvents.find((event) => {
      if (matchedSleepIds.has(event.id)) return false;
      const sleepStart = new Date(event.startedAt).getTime();
      return sleepStart >= routineEnd && sleepStart - routineEnd <= 3 * 60 * 60 * 1000;
    });
    if (!sleep) continue;
    matchedSleepIds.add(sleep.id);
    routineLatencies.push((new Date(sleep.startedAt).getTime() - routineEnd) / 60_000);
    if (routineLatencies.length === 7) break;
  }
  let delta = actual === undefined ? 0 : target - actual;
  if (delta > 720) delta -= 1440;
  if (delta < -720) delta += 1440;
  const adjustment = Math.max(-15, Math.min(15, Math.round(delta)));
  const easeRatings = recentCheckIns.flatMap((item) => item.ease === undefined ? [] : [item.ease]);
  const recordedWakings = recentCheckIns.flatMap((item) => item.nightWakings === undefined ? [] : [item.nightWakings]);
  const checkInAverage = easeRatings.length ? easeRatings.reduce((sum, value) => sum + value, 0) / easeRatings.length : undefined;
  const nightWakingsAverage = recordedWakings.length ? recordedWakings.reduce((sum, value) => sum + value, 0) / recordedWakings.length : undefined;
  const supportEvents = events
    .filter((event) => event.kind === "sleep" && event.sleepSupport && new Date(event.startedAt).getTime() >= cutoff && new Date(event.startedAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 7);
  const supportCounts = new Map<SleepSupport, number>();
  for (const event of supportEvents) supportCounts.set(event.sleepSupport!, (supportCounts.get(event.sleepSupport!) ?? 0) + 1);
  const sleepSupportSummary = [...supportCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([support, count]) => `${sleepSupportLabel(support)} ${count}`)
    .join(", ");
  return {
    actualBedtime: actual === undefined ? undefined : formatClock(actual),
    targetBedtime: formatClock(target),
    suggestedBedtime: formatClock((actual ?? target) + adjustment),
    adjustmentMinutes: adjustment,
    checkInAverage,
    nightWakingsAverage,
    routineToSleepMedianMinutes: routineLatencies.length ? median(routineLatencies) : undefined,
    routineToSleepSamples: routineLatencies.length,
    sleepSupportSummary: sleepSupportSummary || undefined,
    sleepSupportSamples: supportEvents.length,
    nightsUsed: bedtimeSample.length
  };
}

export function handoffSummary(state: AppState, now = new Date(), windowHours: 2 | 4 | 6 | 8 = 4): string {
  const since = now.getTime() - windowHours * 60 * 60 * 1000;
  const recent = state.events.filter((event) => new Date(event.startedAt).getTime() >= since && new Date(event.startedAt).getTime() <= now.getTime());
  const feeds = recent.filter((event) => event.kind === "feed" && event.feedType !== "pump");
  const lastFeed = [...feeds].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const pumping = recent.filter((event) => event.kind === "feed" && event.feedType === "pump");
  const hasPumpingHistory = state.events.some((event) => event.kind === "feed" && event.feedType === "pump");
  const milkInventory = hasPumpingHistory ? createMilkInventory(state.events, now) : undefined;
  const solidMeals = feeds.filter((event) => event.feedType === "solid");
  const amount = feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  const breastfeedingOngoing = state.events.find((event) => event.kind === "feed" && event.feedType === "breast" && !event.endedAt);
  const diapers = recent.filter((event) => event.kind === "diaper").length;
  const lastDiaper = recent.filter((event) => event.kind === "diaper").sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const healthEvents = recent.filter((event) => event.kind === "health");
  const latestMedicationByName = new Map<string, CareEvent>();
  for (const event of state.events) {
    if (event.kind !== "health" || event.healthType !== "medicine" || !event.medicineName?.trim()) continue;
    const key = event.medicineName.trim().toLocaleLowerCase("tr-TR");
    const existing = latestMedicationByName.get(key);
    if (!existing || new Date(event.startedAt).getTime() > new Date(existing.startedAt).getTime()) latestMedicationByName.set(key, event);
  }
  const upcomingMedicationReminders = [...latestMedicationByName.values()]
    .filter((event) => {
      const reminderAt = event.medicationReminderAt ? new Date(event.medicationReminderAt).getTime() : Number.NaN;
      return Number.isFinite(reminderAt) && reminderAt > now.getTime() && reminderAt <= now.getTime() + windowHours * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.medicationReminderAt!).getTime() - new Date(b.medicationReminderAt!).getTime());
  const notes = recent.filter((event) => event.kind === "note" && event.note?.trim());
  const nightWakeLogs = state.sleepPlan.checkIns.flatMap((checkIn) => checkIn.nightWakeLogs ?? [])
    .filter((log) => new Date(log.at).getTime() >= since && new Date(log.at).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const nextTasks = state.careTasks
    .filter((task) => !task.completedAt && new Date(task.dueAt).getTime() >= now.getTime() && new Date(task.dueAt).getTime() <= now.getTime() + 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 3);
  const sleepSegments = state.events.filter((event) => event.kind === "sleep").flatMap((event) => {
    const start = new Date(event.startedAt).getTime();
    const end = Math.min(event.endedAt ? new Date(event.endedAt).getTime() : now.getTime(), now.getTime());
    const overlap = Math.max(0, end - Math.max(start, since));
    return overlap > 0 ? [{ minutes: overlap / 60_000, ongoing: !event.endedAt, startedAt: event.startedAt, endedAt: event.endedAt, sleepSupport: event.sleepSupport }] : [];
  });
  const sleepMinutes = sleepSegments.reduce((sum, segment) => sum + segment.minutes, 0);
  const sleepOngoing = sleepSegments.some((segment) => segment.ongoing);
  const lastSleep = [...sleepSegments].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const eventTime = (value: string) => new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const todayCheckIn = state.sleepPlan.checkIns.find((checkIn) => checkIn.date === localDayKey(now));
  const wakeMinutes = todayCheckIn?.wakeTime ? clockMinutes(todayCheckIn.wakeTime) : null;
  const wakeAt = wakeMinutes === null ? undefined : new Date(now);
  if (wakeAt && wakeMinutes !== null) wakeAt.setHours(Math.floor(wakeMinutes / 60), wakeMinutes % 60, 0, 0);
  const forecastWakeAt = wakeAt && !hasSleepSinceWake(state.events, wakeAt) ? wakeAt : undefined;
  const nextSleepForecast = sleepOngoing ? undefined : createSleepForecast(state.baby, state.events, now, forecastWakeAt, todayCheckIn?.dayContext);
  const parts = [`Son ${windowHours} saatte ${recent.length} kayıt`];
  if (todayCheckIn?.dayContext) {
    parts.push(`Bugün ${sleepDayContextLabel(todayCheckIn.dayContext)} işaretlendi · uyku tahmini ve koçluk planı beklemede`);
  }
  if (nextSleepForecast?.available && nextSleepForecast.start && nextSleepForecast.end && nextSleepForecast.end > now) {
    parts.push(`Tahmini sonraki uyku penceresi ${eventTime(nextSleepForecast.start.toISOString())}–${eventTime(nextSleepForecast.end.toISOString())}`);
  }
  if (nightWakeLogs.length) {
    const latestWake = nightWakeLogs[0]!;
    parts.push(`${nightWakeLogs.length} gece uyanması kaydı · son ${eventTime(latestWake.at)} ${nightWakeResponseLabel(latestWake.response)} · ${latestWake.caregiver}`);
  }
  if (state.careInstructions?.trim()) parts.push(`Bakım talimatı: ${state.careInstructions.trim()}`);
  if (feeds.length) parts.push(`${feeds.length} beslenme kaydı${amount ? ` · ${amount} ml kayıtlı biberon` : ""}`);
  if (lastFeed) {
    const feedLabel = lastFeed.feedType === "breast" ? "emzirme" : lastFeed.feedType === "bottle" ? "biberon" : lastFeed.feedType === "solid" ? "katı öğün" : "beslenme";
    const feedAmount = lastFeed.feedType === "bottle" && lastFeed.amountMl ? ` · ${lastFeed.amountMl} ml` : "";
    parts.push(`Son beslenme ${eventTime(lastFeed.startedAt)} · ${feedLabel}${feedAmount} · ${lastFeed.caregiver}`);
  }
  if (breastfeedingOngoing) {
    const nowMs = now.getTime();
    const sessions = breastfeedingOngoing.breastSessions?.length
      ? breastfeedingOngoing.breastSessions
      : [{ side: breastfeedingOngoing.breastSide === "right" ? "right" as const : "left" as const, startedAt: breastfeedingOngoing.startedAt }];
    const bySide = { left: 0, right: 0 };
    let totalMinutes = 0;
    for (const session of sessions) {
      const start = new Date(session.startedAt).getTime();
      const end = Math.min(session.endedAt ? new Date(session.endedAt).getTime() : nowMs, nowMs);
      const minutes = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 60_000)) : 0;
      totalMinutes += minutes;
      bySide[session.side] += minutes;
    }
    const sideDetails = [bySide.left ? `sol ${bySide.left} dk` : "", bySide.right ? `sağ ${bySide.right} dk` : ""].filter(Boolean).join(", ");
    parts.push(`emzirme sürüyor · ${totalMinutes} dk${sideDetails ? ` (${sideDetails})` : ""}`);
  }
  if (pumping.length) parts.push(`${pumping.length} sağım · ${pumping.reduce((sum, event) => sum + (event.amountMl ?? 0), 0)} ml stoğa eklendi`);
  if (milkInventory) {
    const nextMilk = milkInventory.batches.find((batch) => batch.remainingMl > 0 && !batch.isExpired);
    parts.push(nextMilk
      ? `Kullanılabilir süt stoğu ${milkInventory.availableMl} ml · önce ${nextMilk.remainingMl} ml ${milkStorageLabel(nextMilk.event)}, ${eventTime(nextMilk.useBy.toISOString())} saatine kadar kullanın`
      : "Sağılan süt stoğunda kullanılabilir kayıt yok");
  }
  if (solidMeals.length) {
    const tagged = [...new Set(solidMeals.flatMap((event) => event.allergens ?? []))];
    parts.push(`${solidMeals.length} katı öğün${tagged.length ? ` · etiketlenen: ${tagged.join(", ")}` : ""}`);
  }
  if (sleepMinutes) {
    parts.push(`Son ${windowHours} saatte ${Math.round(sleepMinutes)} dk uyku${sleepOngoing ? " · şu anda uyuyor" : ""}`);
    if (lastSleep) parts.push(`Son uyku ${eventTime(lastSleep.startedAt)}${lastSleep.endedAt ? `–${eventTime(lastSleep.endedAt)}` : " · sürüyor"}${lastSleep.sleepSupport ? ` · ${sleepSupportLabel(lastSleep.sleepSupport)}` : ""}`);
  }
  if (diapers) parts.push(`${diapers} bez`);
  if (lastDiaper) {
    const diaperLabel = lastDiaper.diaperType === "both" ? "ıslak ve kirli" : lastDiaper.diaperType === "dirty" ? "kirli" : "ıslak";
    parts.push(`Son bez ${eventTime(lastDiaper.startedAt)} · ${diaperLabel} · ${lastDiaper.caregiver}`);
  }
  if (healthEvents.length) {
    const healthSummaries = healthEvents.map((event) => {
      if (event.healthType === "temperature") return `ateş ${event.temperatureC ?? "—"} °C`;
      if (event.healthType === "medicine") return `${event.medicineName || "ilaç"}${event.doseAsEntered ? ` (${event.doseAsEntered})` : ""}`;
      return `belirti${event.note ? `: ${event.note.slice(0, 70)}` : ""}`;
    });
    parts.push(`Sağlık: ${healthSummaries.join(", ")}`);
  }
  if (upcomingMedicationReminders.length) {
    parts.push(`Kullanıcının girdiği ilaç planı kontrol saati: ${upcomingMedicationReminders.map((event) => `${event.medicineName} · ${new Date(event.medicationReminderAt!).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`).join(", ")}`);
  }
  if (notes.length) parts.push(`Not: ${notes.map((event) => event.note!.trim().slice(0, 70)).join("; ")}`);
  if (nextTasks.length) parts.push(`Yaklaşan: ${nextTasks.map((task) => `${task.title} · ${new Date(task.dueAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`).join(", ")}`);
  return `${parts.join(" · ")}.`;
}

