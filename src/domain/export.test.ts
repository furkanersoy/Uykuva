import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { mergeDataStates } from "./export";

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
  current.careTasks = [{ id: "task", type: "appointment", title: "Doktor", dueAt: "2026-10-28T10:00:00", completedAt: "2026-10-27T12:00:00" }];
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
  assert.equal(merged.careInstructions, "Biberonu ısıtmayın.\nUyku öncesi kısa ninni.");
  assert.equal(merged.sleepPlan.checkIns[0]?.wakeTime, "07:00");
  assert.deepEqual(merged.sleepPlan.checkIns[0]?.nightWakeLogs?.map((log) => log.id), ["wake-1", "wake-2"]);
  assert.equal(merged.sleepPlan.checkIns[0]?.note, "Gece sakindi.");
  assert.equal(merged.preferences.handoffHours, 2);
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
