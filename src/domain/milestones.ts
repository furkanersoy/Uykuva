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
  add("first_breastfeed_log", "İlk emzirme kaydı", "Emzirme kaydı ilk kez eklendi.", firstEvent(recorded, (event) => event.kind === "feed" && event.feedType === "breast"));
  add("first_bottle_log", "İlk biberon kaydı", "Biberon kaydı ilk kez eklendi.", firstEvent(recorded, (event) => event.kind === "feed" && event.feedType === "bottle"));
  add("first_solid_log", "İlk ek gıda kaydı", "Ek gıda kaydı ilk kez eklendi.", firstEvent(recorded, (event) => event.kind === "feed" && event.feedType === "solid"));
  add("first_pumping_log", "İlk süt sağma kaydı", "Süt sağma kaydı ilk kez eklendi.", firstEvent(recorded, (event) => event.kind === "feed" && event.feedType === "pump"));
  add("first_diaper_log", "İlk bez kaydı", "Bez değişimi ilk kez kaydedildi.", firstEvent(recorded, (event) => event.kind === "diaper"));
  add("first_health_log", "İlk sağlık kaydı", "Bir sağlık gözlemi veya ölçümü ilk kez kaydedildi.", firstEvent(recorded, (event) => event.kind === "health"));
  add("first_growth_log", "İlk büyüme ölçümü", "Bir büyüme ölçümü ilk kez kaydedildi.", firstEvent(recorded, (event) => event.kind === "growth"));

  const sleepLogs = recorded.filter((event) => event.kind === "sleep");
  const diaperLogs = recorded.filter((event) => event.kind === "diaper");
  add("tenth_sleep_log", "10. uyku kaydı", "Uygulamaya onuncu uyku dönemi kaydedildi.", sleepLogs[9]);
  add("tenth_diaper_log", "10. bez kaydı", "Uygulamaya onuncu bez değişimi kaydedildi.", diaperLogs[9]);

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
