import { CareEvent } from "./types";

export type RecordedMilestone = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  saved: boolean;
};

function validRecordedEvents(events: CareEvent[], now: Date) {
  return events.filter((event) => {
    const start = new Date(event.startedAt).getTime();
    return Number.isFinite(start) && start <= now.getTime();
  }).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function firstEvent(events: CareEvent[], predicate: (event: CareEvent) => boolean) {
  return events.find(predicate);
}

/** Finds notable moments supported by saved activity only; it does not infer developmental progress. */
export function detectRecordedMilestones(events: CareEvent[], now = new Date()): RecordedMilestone[] {
  const recorded = validRecordedEvents(events, now);
  const candidates: RecordedMilestone[] = [];
  const add = (id: string, title: string, detail: string, event?: CareEvent) => {
    if (event) candidates.push({ id, title, detail, occurredAt: event.startedAt, saved: false });
  };

  add("first_sleep_log", "İlk uyku kaydı", "Uyku zamanlayıcısı ilk kez kullanıldı.", firstEvent(recorded, (event) => event.kind === "sleep"));
  add("first_feed_log", "İlk beslenme kaydı", "Beslenme kaydı ilk kez eklendi.", firstEvent(recorded, (event) => event.kind === "feed" && event.feedType !== "pump"));
  add("first_solid_log", "İlk ek gıda kaydı", "Ek gıda kaydı ilk kez eklendi.", firstEvent(recorded, (event) => event.kind === "feed" && event.feedType === "solid"));
  add("first_growth_log", "İlk büyüme ölçümü", "Bir büyüme ölçümü ilk kez kaydedildi.", firstEvent(recorded, (event) => event.kind === "growth"));

  const firstFourHourSleep = firstEvent(recorded, (event) => {
    if (event.kind !== "sleep" || !event.endedAt) return false;
    const start = new Date(event.startedAt).getTime();
    const end = new Date(event.endedAt).getTime();
    return Number.isFinite(end) && end > start && end - start >= 4 * 60 * 60 * 1000;
  });
  add("first_four_hour_sleep_log", "İlk 4 saatlik uyku kaydı", "Uygulamaya dört saat veya daha uzun bir uyku dönemi kaydedildi.", firstFourHourSleep);

  const feeds = recorded.filter((event) => event.kind === "feed" && event.feedType !== "pump");
  add("hundredth_feed_log", "100. beslenme kaydı", "Uygulamada 100 beslenme kaydı tamamlandı.", feeds[99]);

  const savedIds = new Set(recorded.filter((event) => event.kind === "memory" && event.milestoneId).map((event) => event.milestoneId));
  return candidates.map((item) => ({ ...item, saved: savedIds.has(item.id) })).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
