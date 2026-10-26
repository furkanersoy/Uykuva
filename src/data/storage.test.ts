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
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.onboardingComplete, true);
  assert.equal(migrated.events.length, 1);
  assert.deepEqual(migrated.careTasks, []);
  assert.equal(migrated.preferences.sleepReminderMinutes, 15);
  assert.equal(migrated.caregivers[0]?.name, "Baba");
  assert.equal(migrated.activeCaregiverId, "caregiver-1");
  assert.deepEqual(migrated.sleepPlan.checkIns, []);
  assert.deepEqual(migrated.sleepPlan.readinessCompleted, []);
});

test("caregiver migration preserves the active identity", () => {
  const migrated = migrateState({
    caregiverName: "Eski ad",
    caregivers: [
      { id: "p1", name: "Anne", role: "parent" },
      { id: "c1", name: "Ece", role: "caregiver" }
    ],
    activeCaregiverId: "c1"
  });
  assert.equal(migrated.caregiverName, "Ece");
  assert.equal(migrated.activeCaregiverId, "c1");
  assert.equal(migrated.caregivers.length, 2);
});

