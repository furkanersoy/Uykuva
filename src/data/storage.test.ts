import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "./seed";
import { migrateState } from "./migrations";
import { createDataExport, parseDataExport } from "../domain/export";
import { deleteChildWorkspace, selectChildWorkspace } from "../domain/children";

test("legacy state receives schema two defaults without losing events", () => {
  const migrated = migrateState({
    baby: { id: "b", name: "Ada", birthDate: "2026-01-01", gestationalWeek: 38 },
    caregiverName: "Baba",
    events: [{ id: "e", kind: "note", startedAt: "2026-10-26T10:00:00Z", caregiver: "Baba", note: "İyi" }],
    sleepPlan: { method: "responsive", startDate: "2026-10-26", day: 3, bedtime: "20:00", wakeTime: "07:00", routine: [], completedToday: [] }
  });
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.onboardingComplete, true);
  assert.equal(migrated.preferences.milkExpiryReminderLead, "adaptive");
  assert.equal(migrated.events.length, 1);
  assert.deepEqual(migrated.careTasks, []);
  assert.equal(migrated.preferences.sleepReminderMinutes, 15);
  assert.equal(migrated.preferences.routineRemindersEnabled, false);
  assert.equal(migrated.caregivers[0]?.name, "Baba");
  assert.equal(migrated.activeCaregiverId, "caregiver-1");
  assert.deepEqual(migrated.sleepPlan.checkIns, []);
  assert.deepEqual(migrated.sleepPlan.readinessCompleted, []);
  assert.deepEqual(migrated.sleepPlan.savedGuideIds, []);
  assert.equal(migrated.children.length, 1);
  assert.equal(migrated.children[0]?.baby.id, "b");
  assert.equal(migrated.activeChildId, "b");
});

test("migration preserves unique saved sleep guides and drops malformed entries", () => {
  const state = createInitialState();
  state.children = [];
  state.sleepPlan.savedGuideIds = ["safe-sleep-space", "safe-sleep-space", "", 3, "routine"] as never;
  const migrated = migrateState(state);
  assert.deepEqual(migrated.sleepPlan.savedGuideIds, ["safe-sleep-space", "routine"]);
});

test("migration preserves all valid completed sleep plan cycles", () => {
  const state = createInitialState();
  state.sleepPlan.completedRuns = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(Date.UTC(2025, 0, 1 + index * 28)).toISOString().slice(0, 10);
    const completedDate = new Date(Date.UTC(2025, 0, 15 + index * 28)).toISOString().slice(0, 10);
    return { id: `run-${index}`, startDate: start, completedDate, days: [] };
  });
  const migrated = migrateState(state);
  assert.equal(migrated.sleepPlan.completedRuns.length, 12);
});

test("multiple child workspaces retain separate records and active selection", () => {
  const first = createInitialState();
  first.baby = { id: "child-a", name: "Ada", birthDate: "2025-01-01", gestationalWeek: 40 };
  first.events = [{ id: "a-event", kind: "note", startedAt: "2026-10-26T10:00:00Z", caregiver: "Anne", note: "A" }];
  const second = createInitialState();
  const secondProfile = { baby: { id: "child-b", name: "Ece", birthDate: "2025-03-01", gestationalWeek: 38 }, careInstructions: "Ayrı not", developmentCheckIns: [], events: [{ id: "b-event", kind: "note" as const, startedAt: "2026-10-26T11:00:00Z", caregiver: "Baba", note: "B" }], careTasks: [], sleepPlan: { ...second.sleepPlan, bedtime: "19:30" } };
  first.children = [{ baby: first.baby, careInstructions: "", developmentCheckIns: [], events: first.events, careTasks: [], sleepPlan: first.sleepPlan }, secondProfile];
  first.activeChildId = "child-b";
  const migrated = migrateState(first);
  assert.equal(migrated.activeChildId, "child-b");
  assert.equal(migrated.baby.name, "Ece");
  assert.equal(migrated.events[0]?.id, "b-event");
  assert.equal(migrated.children.length, 2);
  assert.equal(migrated.children.find((child) => child.baby.id === "child-a")?.events[0]?.id, "a-event");
  assert.equal(migrated.children.find((child) => child.baby.id === "child-b")?.sleepPlan.bedtime, "19:30");
});

test("switching children saves each workspace and deletion selects a remaining child", () => {
  const state = createInitialState();
  state.baby = { ...state.baby, id: "child-a", name: "Ada" };
  state.activeChildId = "child-a";
  state.events = [{ id: "ada-note", kind: "note", startedAt: "2026-10-26T10:00:00Z", caregiver: "Anne", note: "Ada" }];
  const second = createInitialState();
  const ece = { baby: { ...second.baby, id: "child-b", name: "Ece" }, careInstructions: "Ece talimatı", developmentCheckIns: [], events: [{ id: "ece-note", kind: "note" as const, startedAt: "2026-10-26T11:00:00Z", caregiver: "Baba", note: "Ece" }], careTasks: [], sleepPlan: second.sleepPlan };
  state.children = [{ baby: state.baby, careInstructions: "", developmentCheckIns: [], events: state.events, careTasks: [], sleepPlan: state.sleepPlan }, ece];

  const selected = selectChildWorkspace(state, "child-b");
  assert.equal(selected.baby.name, "Ece");
  selected.events = [{ id: "ece-new", kind: "note", startedAt: "2026-10-26T12:00:00Z", caregiver: "Baba", note: "Yeni" }];
  const back = selectChildWorkspace(selected, "child-a");
  assert.equal(back.events[0]?.id, "ada-note");
  const removed = deleteChildWorkspace(selected, "child-b");
  assert.equal(removed.activeChildId, "child-a");
  assert.equal(removed.baby.name, "Ada");
  assert.equal(removed.children.length, 1);
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

test("care task migration keeps assignments to known caregivers only", () => {
  const state = createInitialState();
  state.caregivers.push({ id: "caregiver-2", name: "Baba", role: "parent" });
  const migrated = migrateState({
    ...state,
    children: undefined,
    careTasks: [
      { id: "known", type: "appointment", title: "Kontrol", dueAt: "2026-11-02T10:00:00.000Z", assignedCaregiverId: "caregiver-2" },
      { id: "removed", type: "vaccine", title: "Aşı", dueAt: "2026-11-02T10:00:00.000Z", assignedCaregiverId: "deleted-caregiver" }
    ]
  });
  assert.equal(migrated.careTasks.find((task) => task.id === "known")?.assignedCaregiverId, "caregiver-2");
  assert.equal(migrated.careTasks.find((task) => task.id === "removed")?.assignedCaregiverId, undefined);
});

test("sleep and night-wake details survive export and invalid values are rejected", () => {
  const state = createInitialState();
  state.events = [
    { id: "sleep", kind: "sleep", startedAt: "2026-10-27T08:00:00Z", endedAt: "2026-10-27T09:00:00Z", caregiver: "Anne", sleepSupport: "nearby" },
    { id: "milk", kind: "feed", feedType: "pump", amountMl: 80, milkStorageLocation: "fridge", milkThawedAt: "2026-10-27T06:00:00Z", milkWarmedAt: "2026-10-27T07:30:00Z", startedAt: "2026-10-27T05:00:00Z", caregiver: "Baba" }
  ];
  const secondChild = createInitialState();
  state.children.push({ baby: { id: "child-two", name: "Ece", birthDate: "2025-03-01", gestationalWeek: 38 }, careInstructions: "Ayrı bakım notu", developmentCheckIns: [], events: [{ id: "second-child-note", kind: "note", startedAt: "2026-10-27T06:00:00Z", caregiver: "Anne", note: "İkinci profil" }], careTasks: [], sleepPlan: secondChild.sleepPlan });
  state.activeChildId = state.baby.id;
  state.sleepPlan.checkIns = [{ date: "2026-10-27", dayContext: "travel", nightWakeLogs: [{ id: "wake-1", at: "2026-10-27T02:15:00Z", response: "comfort", caregiver: "Baba" }] }];
  const backup = createDataExport(state);
  assert.equal(parseDataExport(backup).children.length, 2);
  assert.equal(parseDataExport(backup).children.find((child) => child.baby.id === "child-two")?.events[0]?.note, "İkinci profil");
  const legacy = JSON.parse(backup) as Record<string, unknown>;
  delete legacy.children;
  delete legacy.activeChildId;
  legacy.schemaVersion = 3;
  const migratedLegacyBackup = parseDataExport(JSON.stringify(legacy));
  assert.equal(migratedLegacyBackup.children.length, 1);
  assert.equal(migratedLegacyBackup.events.length, 2);
  assert.equal(parseDataExport(backup).events[0]?.sleepSupport, "nearby");
  assert.equal(parseDataExport(backup).events.find((event) => event.id === "milk")?.milkWarmedAt, "2026-10-27T07:30:00Z");
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
  const invalidMilk = JSON.parse(backup) as { events: Array<Record<string, unknown>> };
  invalidMilk.events.find((event) => event.id === "milk")!.milkWarmedAt = "yesterday";
  assert.throws(() => parseDataExport(JSON.stringify(invalidMilk)), /bakım kayıtları/i);
});
