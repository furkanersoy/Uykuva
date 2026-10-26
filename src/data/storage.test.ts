import assert from "node:assert/strict";
import test from "node:test";
import { migrateState } from "./migrations";

test("legacy state receives schema two defaults without losing events", () => {
  const migrated = migrateState({
    baby: { id: "b", name: "Ada", birthDate: "2026-01-01", gestationalWeek: 38 },
    caregiverName: "Baba",
    events: [{ id: "e", kind: "note", startedAt: "2026-10-26T10:00:00Z", caregiver: "Baba", note: "İyi" }],
    sleepPlan: { method: "responsive", startDate: "2026-10-26", day: 3, bedtime: "20:00", wakeTime: "07:00", routine: [], completedToday: [] }
  });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.onboardingComplete, true);
  assert.equal(migrated.events.length, 1);
  assert.equal(migrated.preferences.sleepReminderMinutes, 15);
  assert.deepEqual(migrated.sleepPlan.checkIns, []);
});
