import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "./seed";
import { migrateState } from "./migrations";
import { createDataExport, parseDataExport } from "../domain/export";

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

test("sleep and night-wake details survive export and invalid values are rejected", () => {
  const state = createInitialState();
  state.events = [{ id: "sleep", kind: "sleep", startedAt: "2026-10-27T08:00:00Z", endedAt: "2026-10-27T09:00:00Z", caregiver: "Anne", sleepSupport: "nearby" }];
  state.sleepPlan.checkIns = [{ date: "2026-10-27", dayContext: "travel", nightWakeLogs: [{ id: "wake-1", at: "2026-10-27T02:15:00Z", response: "comfort", caregiver: "Baba" }] }];
  const backup = createDataExport(state);
  assert.equal(parseDataExport(backup).events[0]?.sleepSupport, "nearby");
  assert.equal(parseDataExport(backup).sleepPlan.checkIns[0]?.nightWakeLogs?.[0]?.response, "comfort");
  assert.equal(parseDataExport(backup).sleepPlan.checkIns[0]?.dayContext, "travel");
  const invalid = JSON.parse(backup) as { events: Array<Record<string, unknown>> };
  invalid.events[0]!.sleepSupport = "made-up";
  assert.throws(() => parseDataExport(JSON.stringify(invalid)), /bakım kayıtları/i);
  const invalidWake = JSON.parse(backup) as { sleepPlan: { checkIns: Array<{ nightWakeLogs: Array<Record<string, unknown>> }> } };
  invalidWake.sleepPlan.checkIns[0]!.nightWakeLogs[0]!.response = "made-up";
  assert.throws(() => parseDataExport(JSON.stringify(invalidWake)), /check-in kayıtları/i);
  const invalidContext = JSON.parse(backup) as { sleepPlan: { checkIns: Array<{ dayContext?: string }> } };
  invalidContext.sleepPlan.checkIns[0]!.dayContext = "made-up";
  assert.throws(() => parseDataExport(JSON.stringify(invalidContext)), /check-in kayıtları/i);
});

