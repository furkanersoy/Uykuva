import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { createDataExport, mergeDataStates, parseDataExport } from "./export";

test("sleep coaching task markers round-trip, accept older backups, and reject invalid entries", () => {
  const state = createInitialState();
  state.sleepPlan.completedToday = ["bedtime routine"];
  state.sleepPlan.completedTaskMarkedBy = { "bedtime routine": "Anne" };

  const restored = parseDataExport(createDataExport(state));
  assert.deepEqual(restored.sleepPlan.completedTaskMarkedBy, { "bedtime routine": "Anne" });

  const olderBackup = JSON.parse(createDataExport(state));
  delete olderBackup.sleepPlan.completedTaskMarkedBy;
  for (const profile of (olderBackup.children ?? []) as { sleepPlan?: Record<string, unknown> }[]) {
    if (profile.sleepPlan) delete profile.sleepPlan.completedTaskMarkedBy;
  }
  assert.deepEqual(parseDataExport(JSON.stringify(olderBackup)).sleepPlan.completedTaskMarkedBy, {});

  const staleMarker = JSON.parse(createDataExport(state));
  staleMarker.sleepPlan.completedTaskMarkedBy = { "unfinished task": "Baba" };
  assert.throws(() => parseDataExport(JSON.stringify(staleMarker)));

  const malformedMarker = JSON.parse(createDataExport(state));
  malformedMarker.sleepPlan.completedTaskMarkedBy = { "bedtime routine": 42 };
  assert.throws(() => parseDataExport(JSON.stringify(malformedMarker)));
});

test("memory photos round-trip in local backups and reject invalid or oversized image data", () => {
  const state = createInitialState();
  state.events = [{ id: "memory-photo", kind: "memory", memoryTitle: "İlk gülüş", memoryPhotoData: "data:image/jpeg;base64,AQID", startedAt: "2026-10-28T12:00:00.000Z", caregiver: "Anne" }];
  const restored = parseDataExport(createDataExport(state));
  assert.equal(restored.events[0]?.memoryPhotoData, state.events[0]?.memoryPhotoData);

  const invalidType = JSON.parse(createDataExport(state));
  invalidType.events[0].memoryPhotoData = "file:///private/photo.jpg";
  assert.throws(() => parseDataExport(JSON.stringify(invalidType)), /bakım kayıtları/i);

  const tooLarge = JSON.parse(createDataExport(state));
  tooLarge.events[0].memoryPhotoData = `data:image/jpeg;base64,${"A".repeat(1_100_001)}`;
  assert.throws(() => parseDataExport(JSON.stringify(tooLarge)), /bakım kayıtları/i);
});

test("saved sleep guides round-trip, merge by union, and reject malformed IDs", () => {
  const current = createInitialState();
  current.sleepPlan.savedGuideIds = ["safe-sleep-space"];
  const incoming = createInitialState();
  incoming.sleepPlan.savedGuideIds = ["settling-supports"];
  const restored = parseDataExport(createDataExport(current));
  assert.deepEqual(restored.sleepPlan.savedGuideIds, ["safe-sleep-space"]);
  const merged = mergeDataStates(current, incoming);
  assert.deepEqual(merged.sleepPlan.savedGuideIds, ["safe-sleep-space", "settling-supports"]);

  const invalid = JSON.parse(createDataExport(current));
  invalid.sleepPlan.savedGuideIds = ["", "x".repeat(101)];
  assert.throws(() => parseDataExport(JSON.stringify(invalid)), /Uyku planı veya check-in kayıtları geçersiz/i);
});

test("sync deletion tombstones survive backup round-trip and reject malformed IDs", () => {
  const state = createInitialState();
  state.syncTombstones = { eventIds: ["event-1"], careTaskIds: ["task-1"], nightWakeLogIds: ["wake-1"], childIds: ["child-1"], caregiverIds: ["caregiver-1"] };
  assert.deepEqual(parseDataExport(createDataExport(state)).syncTombstones, state.syncTombstones);

  const invalid = JSON.parse(createDataExport(state));
  invalid.syncTombstones.eventIds = [""];
  assert.throws(() => parseDataExport(JSON.stringify(invalid)), /eşitleme silme kayıtları geçersiz/i);
});

test("morning check-ins preserve the actually applied sleep approach in backups", () => {
  const state = createInitialState();
  state.sleepPlan.checkIns = [{ date: "2026-10-30", appliedMethod: "gradual", ease: 3, sustainability: 4, planReflection: "Bebeğim ses desteğiyle daha kolay sakinleşti." }];
  const restored = parseDataExport(createDataExport(state));
  assert.equal(restored.sleepPlan.checkIns[0]?.appliedMethod, "gradual");
  assert.equal(restored.sleepPlan.checkIns[0]?.sustainability, 4);
  assert.equal(restored.sleepPlan.checkIns[0]?.planReflection, "Bebeğim ses desteğiyle daha kolay sakinleşti.");

  const invalid = JSON.parse(createDataExport(state));
  invalid.sleepPlan.checkIns[0].appliedMethod = "unknown";
  assert.throws(() => parseDataExport(JSON.stringify(invalid)), /geçersiz/i);
  const invalidSustainability = JSON.parse(createDataExport(state));
  invalidSustainability.sleepPlan.checkIns[0].sustainability = 6;
  assert.throws(() => parseDataExport(JSON.stringify(invalidSustainability)), /geçersiz/i);
  const longReflection = JSON.parse(createDataExport(state));
  longReflection.sleepPlan.checkIns[0].planReflection = "x".repeat(301);
  assert.throws(() => parseDataExport(JSON.stringify(longReflection)), /geçersiz/i);
});

test("backup validation accepts the expanded appointment reminder options", () => {
  const state = createInitialState();
  for (const minutes of [15, 30, 60, 120, 180, 1440] as const) {
    state.preferences.careTaskReminderMinutes = minutes;
    const restored = parseDataExport(createDataExport(state));
    assert.equal(restored.preferences.careTaskReminderMinutes, minutes);
  }
  state.preferences.careTaskReminderMinutes = 45 as never;
  assert.throws(() => parseDataExport(createDataExport(state)), /tercih bilgileri eksik/i);
});

test("assigned care tasks round-trip and reject malformed caregiver IDs", () => {
  const state = createInitialState();
  state.caregivers.push({ id: "caregiver-2", name: "Baba", role: "parent" });
  state.careTasks = [{ id: "appointment-1", type: "appointment", title: "Kontrol", dueAt: "2026-11-02T10:00:00.000Z", assignedCaregiverId: "caregiver-2" }];
  const restored = parseDataExport(createDataExport(state));
  assert.equal(restored.careTasks[0]?.assignedCaregiverId, "caregiver-2");

  const invalid = JSON.parse(createDataExport(state));
  invalid.careTasks[0].assignedCaregiverId = "x".repeat(101);
  assert.throws(() => parseDataExport(JSON.stringify(invalid)), /aşı veya randevu kayıtları/i);
});

test("backup round-trips milk reminder lead preferences and rejects invalid values", () => {
  const state = createInitialState();
  for (const lead of ["adaptive", 2, 6, 12, 24, 48] as const) {
    state.preferences.milkExpiryReminderLead = lead;
    const restored = parseDataExport(createDataExport(state));
    assert.equal(restored.preferences.milkExpiryReminderLead, lead);
  }
  state.preferences.milkExpiryReminderLead = 5 as never;
  assert.throws(() => parseDataExport(createDataExport(state)), /tercih bilgileri eksik/i);
});

test("wake reminder preferences round-trip and older backups remain valid", () => {
  const state = createInitialState();
  state.preferences.wakeReminderEnabled = true;
  state.preferences.wakeReminderMinutes = 20;
  const restored = parseDataExport(createDataExport(state));
  assert.equal(restored.preferences.wakeReminderEnabled, true);
  assert.equal(restored.preferences.wakeReminderMinutes, 20);
  const older = JSON.parse(createDataExport(state));
  delete older.preferences.wakeReminderEnabled;
  delete older.preferences.wakeReminderMinutes;
  const migrated = parseDataExport(JSON.stringify(older));
  assert.equal(migrated.preferences.wakeReminderEnabled, false);
  assert.equal(migrated.preferences.wakeReminderMinutes, 10);
  state.preferences.wakeReminderMinutes = 3 as never;
  assert.throws(() => parseDataExport(createDataExport(state)), /uyanma hatırlatması/i);
});

test("completed sleep plan history is not capped during export, restore, or merge", () => {
  const runs = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(Date.UTC(2025, 0, 1 + index * 28)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(2025, 0, 15 + index * 28)).toISOString().slice(0, 10);
    return { id: `run-${index}`, startDate: start, completedDate: end, days: [] };
  });
  const current = createInitialState();
  current.sleepPlan.completedRuns = runs;
  const restored = parseDataExport(createDataExport(current));
  assert.equal(restored.sleepPlan.completedRuns.length, 12);

  const incoming = createInitialState();
  incoming.sleepPlan.completedRuns = [...runs, { id: "run-12", startDate: "2025-12-03", completedDate: "2025-12-17", days: [] }];
  const merged = mergeDataStates(current, incoming);
  assert.equal(merged.sleepPlan.completedRuns.length, 13);
  assert.equal(new Set(merged.sleepPlan.completedRuns.map((run) => run.id)).size, 13);
});

test("backup merge combines records and check-ins while preserving current device settings", () => {
  const current = createInitialState();
  const incoming = createInitialState();
  current.events = [
    { id: "shared", kind: "sleep", startedAt: "2026-10-27T08:00:00", caregiver: "Anne" },
    { id: "already-ended", kind: "sleep", startedAt: "2026-10-27T07:00:00", endedAt: "2026-10-27T07:30:00", caregiver: "Anne" }
  ];
  incoming.events = [
    { id: "shared", kind: "sleep", startedAt: "2026-10-27T08:00:00", endedAt: "2026-10-27T08:45:00", caregiver: "Anne" },
    { id: "already-ended", kind: "sleep", startedAt: "2026-10-27T07:00:00", caregiver: "Anne" },
    { id: "new-feed", kind: "feed", feedType: "bottle", amountMl: 90, startedAt: "2026-10-27T09:00:00", caregiver: "Baba" }
  ];
  current.careTasks = [{ id: "task", type: "appointment", title: "Doktor", dueAt: "2026-10-28T10:00:00", completedAt: "2026-10-27T12:00:00", assignedCaregiverId: "caregiver-1" }];
  incoming.careTasks = [{ id: "task", type: "appointment", title: "Doktor", dueAt: "2026-10-28T10:00:00" }];
  current.careInstructions = "Biberonu ısıtmayın.";
  incoming.careInstructions = "Uyku öncesi kısa ninni.";
  current.sleepPlan.checkIns = [{ date: "2026-10-27", note: "Gece sakindi.", nightWakeLogs: [{ id: "wake-1", at: "2026-10-27T02:00:00", response: "comfort", caregiver: "Anne" }] }];
  incoming.sleepPlan.checkIns = [{ date: "2026-10-27", wakeTime: "07:00", nightWakeLogs: [{ id: "wake-2", at: "2026-10-27T04:00:00", response: "feeding", caregiver: "Baba" }] }];
  current.preferences.handoffHours = 2;
  incoming.preferences.handoffHours = 8;

  const merged = mergeDataStates(current, incoming);

  assert.equal(merged.events.length, 3);
  assert.equal(merged.events.find((event) => event.id === "shared")?.endedAt, "2026-10-27T08:45:00");
  assert.equal(merged.events.find((event) => event.id === "already-ended")?.endedAt, "2026-10-27T07:30:00");
  assert.equal(merged.careTasks[0]?.completedAt, "2026-10-27T12:00:00");
  assert.equal(merged.careTasks[0]?.assignedCaregiverId, "caregiver-1");
  assert.equal(merged.careInstructions, "Biberonu ısıtmayın.\nUyku öncesi kısa ninni.");
  assert.equal(merged.sleepPlan.checkIns[0]?.wakeTime, "07:00");
  assert.deepEqual(merged.sleepPlan.checkIns[0]?.nightWakeLogs?.map((log) => log.id), ["wake-1", "wake-2"]);
  assert.equal(merged.sleepPlan.checkIns[0]?.note, "Gece sakindi.");
  assert.equal(merged.preferences.handoffHours, 2);
});

test("backup merge remaps care-task assignments when caregiver IDs collide", () => {
  const current = createInitialState();
  const incoming = createInitialState();
  current.caregivers.push({ id: "caregiver-2", name: "Baba", role: "parent" });
  incoming.caregivers.push({ id: "caregiver-2", name: "Ece", role: "caregiver" });
  incoming.careTasks = [{ id: "imported-task", type: "appointment", title: "Kontrol", dueAt: "2026-11-02T10:00:00.000Z", assignedCaregiverId: "caregiver-2" }];

  const merged = mergeDataStates(current, incoming);
  const task = merged.careTasks.find((item) => item.id === "imported-task");
  assert.ok(task?.assignedCaregiverId);
  assert.equal(merged.caregivers.find((caregiver) => caregiver.id === task?.assignedCaregiverId)?.name, "Ece");
});

test("backup merge rejects a different child profile", () => {
  const current = createInitialState();
  const incoming = createInitialState();
  incoming.baby.birthDate = "2025-01-01";
  assert.throws(() => mergeDataStates(current, incoming), /farklı bir bebek profiline ait/i);
});

test("backup merge unions children and keeps each child's records separate", () => {
  const current = createInitialState();
  const incoming = createInitialState();
  const currentChild = { baby: { id: "child-2", name: "Mina", birthDate: "2025-03-01", gestationalWeek: 39 }, careInstructions: "Mina notu", developmentCheckIns: [], events: [{ id: "mina-current", kind: "note" as const, startedAt: "2026-10-27T08:00:00Z", caregiver: "Anne", note: "Evde" }], careTasks: [], sleepPlan: createInitialState().sleepPlan };
  const importedChild = { ...currentChild, careInstructions: "Yedekten gelen not", events: [{ id: "mina-backup", kind: "note" as const, startedAt: "2026-10-27T09:00:00Z", caregiver: "Baba", note: "Dışarıda" }] };
  current.children.push(currentChild);
  incoming.children.push(importedChild);
  const merged = mergeDataStates(current, incoming);
  const mina = merged.children.find((child) => child.baby.id === "child-2");
  assert.equal(merged.children.length, 2);
  assert.deepEqual(mina?.events.map((event) => event.id).sort(), ["mina-backup", "mina-current"]);
  assert.match(mina?.careInstructions ?? "", /Mina notu/);
  assert.match(mina?.careInstructions ?? "", /Yedekten gelen not/);
  assert.equal(merged.activeChildId, current.activeChildId);
});

test("backup merge tombstones prevent deleted records, caregivers, and children from returning", () => {
  const current = createInitialState();
  const incoming = createInitialState();
  current.caregivers.push({ id: "caregiver-deleted", name: "Silinmiş bakıcı", role: "caregiver" });
  incoming.caregivers.push({ id: "caregiver-deleted", name: "Silinmiş bakıcı", role: "caregiver" });
  const staleChild = { ...createInitialState(), baby: { id: "child-deleted", name: "Mina", birthDate: "2025-03-01", gestationalWeek: 39 } };
  current.children.push({ baby: staleChild.baby, careInstructions: "", developmentCheckIns: [], events: [], careTasks: [], sleepPlan: staleChild.sleepPlan });
  incoming.children.push({ baby: staleChild.baby, careInstructions: "", developmentCheckIns: [], events: [{ id: "deleted-event", kind: "note" as const, startedAt: "2026-10-27T10:00:00Z", caregiver: "Anne" }], careTasks: [{ id: "deleted-task", type: "appointment" as const, title: "Eski görev", dueAt: "2026-10-28T10:00:00Z", assignedCaregiverId: "caregiver-deleted" }], sleepPlan: { ...staleChild.sleepPlan, checkIns: [{ date: "2026-10-27", nightWakeLogs: [{ id: "deleted-wake", at: "2026-10-27T02:00:00Z", response: "comfort" as const, caregiver: "Anne" }] }] } });
  current.syncTombstones = { eventIds: ["deleted-event"], careTaskIds: ["deleted-task"], nightWakeLogIds: ["deleted-wake"], childIds: ["child-deleted"], caregiverIds: ["caregiver-deleted"] };

  const merged = mergeDataStates(current, incoming);

  assert.equal(merged.children.some((child) => child.baby.id === "child-deleted"), false);
  assert.equal(merged.events.some((event) => event.id === "deleted-event"), false);
  assert.equal(merged.careTasks.some((task) => task.id === "deleted-task"), false);
  assert.equal(merged.caregivers.some((caregiver) => caregiver.id === "caregiver-deleted"), false);
  assert.deepEqual(merged.syncTombstones, current.syncTombstones);
});

test("backup merge filters tombstoned night-wake logs from the active child", () => {
  const current = createInitialState();
  const incoming = createInitialState();
  incoming.sleepPlan.checkIns = [{ date: "2026-10-27", nightWakeLogs: [{ id: "deleted-wake", at: "2026-10-27T02:00:00Z", response: "comfort", caregiver: "Anne" }] }];
  current.syncTombstones.nightWakeLogIds = ["deleted-wake"];

  const merged = mergeDataStates(current, incoming);

  assert.equal(merged.sleepPlan.checkIns[0]?.nightWakeLogs?.length ?? 0, 0);
});
