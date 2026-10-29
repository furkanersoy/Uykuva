import { sleepWakeReminderDate } from "./time";

export type WakeReminderEstimate = { childId: string; babyName: string; typical: Date };
export type WakeReminderAdapter = {
  list: () => Promise<string[]>;
  cancel: (id: string) => Promise<void>;
  schedule: (estimate: WakeReminderEstimate, date: Date, leadMinutes: number) => Promise<void>;
};

export function createWakeReminderCoordinator(adapter: WakeReminderAdapter, now = () => new Date()) {
  let generation = 0;
  let queue: Promise<void> = Promise.resolve();
  return (estimates: WakeReminderEstimate[], leadMinutes: number, quietStart: string, quietEnd: string): Promise<void> => {
    const current = ++generation;
    queue = queue.catch(() => undefined).then(async () => {
      if (current !== generation) return;
      const ids = await adapter.list();
      await Promise.all(ids.map((id) => adapter.cancel(id)));
      if (current !== generation) return;
      for (const estimate of estimates) {
        if (current !== generation) return;
        const date = sleepWakeReminderDate(estimate.typical, leadMinutes, quietStart, quietEnd, now());
        if (date) await adapter.schedule(estimate, date, leadMinutes);
      }
    });
    return queue;
  };
}
