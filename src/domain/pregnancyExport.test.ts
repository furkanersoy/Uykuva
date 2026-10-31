import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { createDataExport, mergeDataStates, parseDataExport } from "./export";

test("pregnancy profile survives a local backup round-trip", () => {
  const state = createInitialState();
  state.pregnancyProfile = {
    dueDate: "2027-02-12",
    updatedAt: "2026-10-31T09:00:00.000Z",
    deleted: false,
    activities: [
      { id: "movement-1", kind: "movement", startedAt: "2026-10-31T08:00:00.000Z", endedAt: "2026-10-31T08:30:00.000Z", movementCount: 4, updatedAt: "2026-10-31T08:30:00.000Z" },
      { id: "contraction-1", kind: "contraction", startedAt: "2026-10-31T09:00:00.000Z", endedAt: "2026-10-31T09:01:00.000Z", updatedAt: "2026-10-31T09:01:00.000Z" }
    ]
  };
  const restored = parseDataExport(createDataExport(state));
  assert.deepEqual(restored.pregnancyProfile, state.pregnancyProfile);
  assert.equal(restored.schemaVersion, 8);
});

test("old backup without a pregnancy profile remains readable", () => {
  const state = createInitialState();
  const legacy = JSON.parse(createDataExport(state)) as Record<string, unknown>;
  legacy.schemaVersion = 7;
  delete legacy.pregnancyProfile;
  const restored = parseDataExport(JSON.stringify(legacy));
  assert.equal(restored.pregnancyProfile, undefined);
  assert.equal(restored.schemaVersion, 8);
});

test("backup validation rejects malformed pregnancy dates", () => {
  const state = createInitialState();
  const payload = JSON.parse(createDataExport(state)) as Record<string, unknown>;
  payload.pregnancyProfile = { dueDate: "2026-02-30", updatedAt: "2026-10-31T09:00:00.000Z", deleted: false };
  assert.throws(() => parseDataExport(JSON.stringify(payload)), /pregnancy profile/i);
});

test("backup validation rejects invalid pregnancy activity records", () => {
  const state = createInitialState();
  const payload = JSON.parse(createDataExport(state)) as Record<string, unknown>;
  payload.pregnancyProfile = {
    dueDate: "2027-02-12",
    updatedAt: "2026-10-31T09:00:00.000Z",
    deleted: false,
    activities: [{ id: "movement-1", kind: "movement", startedAt: "2026-10-31T08:00:00.000Z", updatedAt: "2026-10-31T08:00:00.000Z" }]
  };
  assert.throws(() => parseDataExport(JSON.stringify(payload)), /pregnancy profile/i);
});

test("family merge applies newest pregnancy profile including removal tombstones", () => {
  const current = createInitialState();
  current.pregnancyProfile = {
    dueDate: "2027-01-10",
    updatedAt: "2026-10-30T09:00:00.000Z",
    deleted: false,
    activities: [{ id: "movement-1", kind: "movement", startedAt: "2026-10-30T08:00:00.000Z", movementCount: 2, updatedAt: "2026-10-30T08:10:00.000Z" }]
  };
  const incoming = createInitialState();
  incoming.pregnancyProfile = {
    dueDate: "2027-01-10",
    updatedAt: "2026-10-31T09:00:00.000Z",
    deleted: true,
    activities: [
      { id: "movement-1", kind: "movement", startedAt: "2026-10-30T08:00:00.000Z", endedAt: "2026-10-31T09:00:00.000Z", movementCount: 2, updatedAt: "2026-10-31T09:00:00.000Z", deletedAt: "2026-10-31T09:00:00.000Z" },
      { id: "contraction-1", kind: "contraction", startedAt: "2026-10-31T08:00:00.000Z", endedAt: "2026-10-31T08:01:00.000Z", updatedAt: "2026-10-31T08:01:00.000Z" }
    ]
  };
  const merged = mergeDataStates(current, incoming).pregnancyProfile!;
  const reverseMerged = mergeDataStates(incoming, current).pregnancyProfile!;
  assert.equal(merged.deleted, true);
  assert.equal(merged.activities?.length, 2);
  assert.equal(merged.activities?.find((item) => item.id === "movement-1")?.deletedAt, "2026-10-31T09:00:00.000Z");
  assert.equal(reverseMerged.deleted, true);
  assert.equal(reverseMerged.activities?.find((item) => item.id === "contraction-1")?.id, "contraction-1");
});
