import assert from "node:assert/strict";
import test from "node:test";
import { createWakeReminderCoordinator } from "./wakeReminders";

test("wake reminders replace old notifications and schedule each eligible child", async () => {
  const scheduled = new Map<string, Date>([["old", new Date(2026, 9, 30, 12, 30)]]);
  const replace = createWakeReminderCoordinator({
    list: async () => [...scheduled.keys()],
    cancel: async (id) => { scheduled.delete(id); },
    schedule: async (estimate, date) => { scheduled.set(estimate.childId, date); }
  }, () => new Date(2026, 9, 30, 12));
  await replace([
    { childId: "one", babyName: "Bir", typical: new Date(2026, 9, 30, 13) },
    { childId: "two", babyName: "İki", typical: new Date(2026, 9, 30, 14) },
    { childId: "past", babyName: "Üç", typical: new Date(2026, 9, 30, 12, 5) }
  ], 10, "21:00", "07:00");
  assert.deepEqual([...scheduled.keys()], ["one", "two"]);
  assert.equal(scheduled.get("one")?.getTime(), new Date(2026, 9, 30, 12, 50).getTime());
});

test("turning off a reminder during scheduling removes the late notification", async () => {
  const scheduled = new Set<string>();
  let signalStarted!: () => void;
  let releaseSchedule!: () => void;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  const gate = new Promise<void>((resolve) => { releaseSchedule = resolve; });
  const replace = createWakeReminderCoordinator({
    list: async () => [...scheduled],
    cancel: async (id) => { scheduled.delete(id); },
    schedule: async (estimate) => { signalStarted(); await gate; scheduled.add(estimate.childId); }
  }, () => new Date(2026, 9, 30, 12));
  const enabling = replace([{ childId: "one", babyName: "Bir", typical: new Date(2026, 9, 30, 13) }], 10, "21:00", "07:00");
  await started;
  const disabling = replace([], 10, "21:00", "07:00");
  releaseSchedule();
  await Promise.all([enabling, disabling]);
  assert.equal(scheduled.size, 0);
});
