import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { createDataExport, mergeDataStates, parseDataExport } from "./export";

test("pregnancy profile survives a local backup round-trip", () => {
  const state = createInitialState();
  state.pregnancyProfile = { dueDate: "2027-02-12", updatedAt: "2026-10-31T09:00:00.000Z", deleted: false };
  const restored = parseDataExport(createDataExport(state));
  assert.deepEqual(restored.pregnancyProfile, state.pregnancyProfile);
  assert.equal(restored.schemaVersion, 7);
});

test("old backup without a pregnancy profile remains readable", () => {
  const state = createInitialState();
  const legacy = JSON.parse(createDataExport(state)) as Record<string, unknown>;
  legacy.schemaVersion = 6;
  delete legacy.pregnancyProfile;
  const restored = parseDataExport(JSON.stringify(legacy));
  assert.equal(restored.pregnancyProfile, undefined);
  assert.equal(restored.schemaVersion, 7);
});

test("backup validation rejects malformed pregnancy dates", () => {
  const state = createInitialState();
  const payload = JSON.parse(createDataExport(state)) as Record<string, unknown>;
  payload.pregnancyProfile = { dueDate: "2026-02-30", updatedAt: "2026-10-31T09:00:00.000Z", deleted: false };
  assert.throws(() => parseDataExport(JSON.stringify(payload)), /pregnancy profile/i);
});

test("family merge applies newest pregnancy profile including removal tombstones", () => {
  const current = createInitialState();
  current.pregnancyProfile = { dueDate: "2027-01-10", updatedAt: "2026-10-30T09:00:00.000Z", deleted: false };
  const incoming = createInitialState();
  incoming.pregnancyProfile = { dueDate: "2027-01-10", updatedAt: "2026-10-31T09:00:00.000Z", deleted: true };
  assert.deepEqual(mergeDataStates(current, incoming).pregnancyProfile, incoming.pregnancyProfile);
  assert.deepEqual(mergeDataStates(incoming, current).pregnancyProfile, incoming.pregnancyProfile);
});
