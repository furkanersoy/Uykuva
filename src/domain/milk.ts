import { CareEvent, MilkExpiryReminderLead } from "./types";

export function milkExpiryReminderLeadMs(remainingMs: number, preference: MilkExpiryReminderLead): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  if (preference !== "adaptive") return Math.min(preference * 60 * 60_000, Math.floor(remainingMs / 2));
  return remainingMs <= 2 * 60 * 60_000 ? 30 * 60_000
    : remainingMs <= 4 * 60 * 60_000 ? 60 * 60_000
      : remainingMs <= 24 * 60 * 60_000 ? 2 * 60 * 60_000
        : remainingMs <= 4 * 24 * 60 * 60_000 ? 12 * 60 * 60_000
          : 24 * 60 * 60_000;
}

export type MilkBatch = {
  event: CareEvent;
  remainingMl: number;
  bestBy: Date;
  useBy: Date;
  isExpired: boolean;
  isThawed: boolean;
};

export type MilkInventory = {
  batches: MilkBatch[];
  availableMl: number;
  expiringSoonCount: number;
};

function addMonths(date: Date, months: number) {
  const value = new Date(date);
  const day = value.getDate();
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  const lastDay = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  value.setDate(Math.min(day, lastDay));
  return value;
}

function batchDates(event: CareEvent) {
  const storedAt = new Date(event.startedAt);
  if (event.milkWarmedAt) {
    const warmedAt = new Date(event.milkWarmedAt);
    const warmedUseBy = new Date(warmedAt.getTime() + 2 * 60 * 60 * 1000);
    const thawedUseBy = event.milkThawedAt ? new Date(new Date(event.milkThawedAt).getTime() + 24 * 60 * 60 * 1000) : warmedUseBy;
    const useBy = new Date(Math.min(warmedUseBy.getTime(), thawedUseBy.getTime()));
    return { bestBy: useBy, useBy, isThawed: Boolean(event.milkThawedAt) };
  }
  if (event.milkThawedAt) {
    const thawedAt = new Date(event.milkThawedAt);
    const useBy = new Date(thawedAt.getTime() + 24 * 60 * 60 * 1000);
    return { bestBy: useBy, useBy, isThawed: true };
  }
  if (event.milkStorageLocation === "room") {
    const useBy = new Date(storedAt.getTime() + 4 * 60 * 60 * 1000);
    return { bestBy: useBy, useBy, isThawed: false };
  }
  if (event.milkStorageLocation === "fridge") {
    const useBy = new Date(storedAt.getTime() + 4 * 24 * 60 * 60 * 1000);
    return { bestBy: useBy, useBy, isThawed: false };
  }
  return { bestBy: addMonths(storedAt, 6), useBy: addMonths(storedAt, 12), isThawed: false };
}

export function createMilkInventory(events: CareEvent[], now = new Date()): MilkInventory {
  const pumpEvents = events
    .filter((event) => event.kind === "feed" && event.feedType === "pump" && event.milkStorageLocation && (event.amountMl ?? 0) > 0)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const remaining = new Map(pumpEvents.map((event) => [event.id, event.amountMl ?? 0]));
  const expressedBottles = events
    .filter((event) => event.kind === "feed" && event.feedType === "bottle" && event.bottleSource === "expressed" && (event.amountMl ?? 0) > 0)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  for (const bottle of expressedBottles) {
    let amount = bottle.amountMl ?? 0;
    const bottleTime = new Date(bottle.startedAt).getTime();
    for (const batch of pumpEvents) {
      if (amount <= 0) break;
      const pumpedAt = new Date(batch.startedAt).getTime();
      const discardedAt = batch.milkDiscardedAt ? new Date(batch.milkDiscardedAt).getTime() : Number.POSITIVE_INFINITY;
      const dates = batchDates(batch);
      const stockAtBottle = new Date(bottle.startedAt) >= dates.useBy;
      if (pumpedAt > bottleTime || discardedAt <= bottleTime || stockAtBottle) continue;
      const available = remaining.get(batch.id) ?? 0;
      const used = Math.min(available, amount);
      remaining.set(batch.id, available - used);
      amount -= used;
    }
  }

  const batches = pumpEvents
    .filter((event) => !event.milkDiscardedAt || new Date(event.milkDiscardedAt).getTime() > now.getTime())
    .map((event) => {
      const dates = batchDates(event);
      return {
        event,
        remainingMl: remaining.get(event.id) ?? 0,
        ...dates,
        isExpired: dates.useBy.getTime() <= now.getTime()
      };
    });
  const expiringSoonCount = batches.filter((batch) => batch.remainingMl > 0 && !batch.isExpired && batch.useBy.getTime() <= now.getTime() + 48 * 60 * 60 * 1000).length;
  return {
    batches,
    availableMl: batches.reduce((sum, batch) => sum + (!batch.isExpired ? batch.remainingMl : 0), 0),
    expiringSoonCount
  };
}

export function milkStorageLabel(event: CareEvent) {
  if (event.milkWarmedAt) return "Isıtılmış / oda sıcaklığında · 2 sa";
  if (event.milkThawedAt) return "Çözdürülmüş · buzdolabı";
  return { room: "Oda sıcaklığı", fridge: "Buzdolabı", freezer: "Dondurucu" }[event.milkStorageLocation ?? "fridge"];
}
