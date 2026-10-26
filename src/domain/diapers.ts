import { CareEvent } from "./types";

export type DailyDiaperTotal = {
  date: string;
  label: string;
  wet: number;
  dirty: number;
  mixed: number;
  total: number;
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weeklyDiaperTotals(events: CareEvent[], now = new Date()): DailyDiaperTotal[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return { date, key: localDateKey(date), wet: 0, dirty: 0, mixed: 0 };
  });

  for (const event of events) {
    if (event.kind !== "diaper") continue;
    const date = new Date(event.startedAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() > now.getTime()) continue;
    const day = days.find((item) => item.key === localDateKey(date));
    if (!day) continue;
    const type = event.diaperType ?? "wet";
    if (type === "wet") day.wet += 1;
    else if (type === "dirty") day.dirty += 1;
    else day.mixed += 1;
  }

  return days.map((day) => ({
    date: day.key,
    label: day.date.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""),
    wet: day.wet,
    dirty: day.dirty,
    mixed: day.mixed,
    total: day.wet + day.dirty + day.mixed
  }));
}
