import { CareEvent, FeedingForecast } from "./types";
import { median } from "./sleep";

export const TRACKED_ALLERGENS = [
  "Gluten içeren tahıllar", "Kabuklular", "Yumurta", "Balık", "Yer fıstığı", "Soya", "Süt",
  "Sert kabuklu yemişler", "Kereviz", "Hardal", "Susam", "Sülfit", "Acı bakla", "Yumuşakçalar"
] as const;

export function completedFeedMinutes(event: CareEvent): number {
  if (event.kind !== "feed" || !event.endedAt) return 0;
  if (event.breastSessions?.length) {
    return event.breastSessions.reduce((sum, session) => {
      if (!session.endedAt) return sum;
      return sum + Math.max(0, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
    }, 0);
  }
  return Math.max(0, Math.round((new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime()) / 60_000));
}

export function feedingElapsedMinutes(event: CareEvent, now = new Date()): number {
  if (event.kind !== "feed") return 0;
  if (!event.breastSessions?.length) {
    const end = event.endedAt ? new Date(event.endedAt) : now;
    return Math.max(0, Math.round((end.getTime() - new Date(event.startedAt).getTime()) / 60_000));
  }
  return event.breastSessions.reduce((sum, session) => {
    const end = session.endedAt ? new Date(session.endedAt) : now;
    return sum + Math.max(0, Math.round((end.getTime() - new Date(session.startedAt).getTime()) / 60_000));
  }, 0);
}

export function breastfeedingSideMinutes(event: CareEvent, now = new Date()) {
  const totals = { left: 0, right: 0 };
  if (event.breastSessions?.length) {
    for (const session of event.breastSessions) {
      const end = session.endedAt ? new Date(session.endedAt) : now;
      totals[session.side] += Math.max(0, Math.round((end.getTime() - new Date(session.startedAt).getTime()) / 60_000));
    }
    return totals;
  }
  const total = feedingElapsedMinutes(event, now);
  if (event.breastSide === "left") totals.left = total;
  else if (event.breastSide === "right") totals.right = total;
  return totals;
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
    .filter((event) => event.kind === "feed" && event.feedType !== "pump")
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

export function todayFeedingTotals(events: CareEvent[], now = new Date(), rolling24Hours = false) {
  const day = now.toDateString();
  const periodStart = rolling24Hours
    ? now.getTime() - 24 * 60 * 60 * 1000
    : new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const periodEnd = now.getTime();
  const feeds = events.filter((event) => {
    if (event.kind !== "feed" || event.feedType === "pump") return false;
    const start = new Date(event.startedAt).getTime();
    if (!Number.isFinite(start) || start > periodEnd) return false;
    if (event.feedType !== "breast") return start >= periodStart;
    const end = event.endedAt ? new Date(event.endedAt).getTime() : periodEnd;
    return Number.isFinite(end) && start < periodEnd && end > periodStart;
  });
  return {
    count: feeds.length,
    bottleMl: feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0),
    breastMinutes: feeds.reduce((sum, event) => {
      if (event.feedType !== "breast") return sum;
      const start = Math.max(new Date(event.startedAt).getTime(), periodStart);
      const end = Math.min(event.endedAt ? new Date(event.endedAt).getTime() : periodEnd, periodEnd);
      return sum + Math.max(0, Math.round((end - start) / 60_000));
    }, 0),
    solids: feeds.filter((event) => event.feedType === "solid").length
  };
}
