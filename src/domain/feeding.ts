import { CareEvent, FeedingForecast } from "./types";
import { median } from "./sleep";

export const TRACKED_ALLERGENS = [
  "Gluten içeren tahıllar", "Kabuklular", "Yumurta", "Balık", "Yer fıstığı", "Soya", "Süt",
  "Sert kabuklu yemişler", "Kereviz", "Hardal", "Susam", "Sülfit", "Acı bakla", "Yumuşakçalar"
] as const;

export function completedFeedMinutes(event: CareEvent): number {
  if (event.kind !== "feed" || !event.endedAt) return 0;
  return Math.max(0, Math.round((new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime()) / 60_000));
}

export function nextBreastSide(events: CareEvent[]): "left" | "right" | null {
  const latest = events
    .filter((event) => event.kind === "feed" && event.feedType === "breast" && event.breastSide && event.breastSide !== "both")
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  if (!latest?.breastSide) return null;
  return latest.breastSide === "left" ? "right" : "left";
}

export function createFeedingForecast(events: CareEvent[], now = new Date()): FeedingForecast {
  const feeds = events
    .filter((event) => event.kind === "feed")
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-11);
  if (feeds.length < 4) {
    return { available: false, confidence: "low", explanation: "Beslenme ritmi için en az 4 kayıt gerekiyor." };
  }
  const intervals: number[] = [];
  for (let index = 1; index < feeds.length; index += 1) {
    const value = (new Date(feeds[index]!.startedAt).getTime() - new Date(feeds[index - 1]!.startedAt).getTime()) / 60_000;
    if (value >= 30 && value <= 480) intervals.push(value);
  }
  if (intervals.length < 3) {
    return { available: false, confidence: "low", explanation: "Düzenli bir aralık göstermek için biraz daha kayıt gerekiyor." };
  }
  const typical = median(intervals);
  const last = new Date(feeds[feeds.length - 1]!.startedAt);
  const spread = intervals.length >= 7 ? 15 : 25;
  const start = new Date(last.getTime() + Math.max(30, typical - spread) * 60_000);
  const end = new Date(last.getTime() + (typical + spread) * 60_000);
  return {
    available: true,
    start,
    end,
    confidence: intervals.length >= 7 ? "high" : "medium",
    explanation: `Son ${intervals.length} kayıtlı beslenme aralığının medyanı kullanıldı. Bebeğinizin açlık sinyalleri her zaman önceliklidir.`
  };
}

export function todayFeedingTotals(events: CareEvent[], now = new Date()) {
  const day = now.toDateString();
  const feeds = events.filter((event) => event.kind === "feed" && new Date(event.startedAt).toDateString() === day);
  return {
    count: feeds.length,
    bottleMl: feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0),
    breastMinutes: feeds.reduce((sum, event) => sum + completedFeedMinutes(event), 0),
    solids: feeds.filter((event) => event.feedType === "solid").length
  };
}
