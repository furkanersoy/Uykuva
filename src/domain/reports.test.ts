import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { createDoctorSummary } from "./reports";

test("doctor summary labels medicine dose as user-entered and avoids advice", () => {
  const state = createInitialState();
  state.events = [{
    id: "h1",
    kind: "health",
    healthType: "medicine",
    medicineName: "Örnek",
    doseAsEntered: "2 ml",
    startedAt: "2026-10-25T20:00:00Z",
    caregiver: "Anne"
  }];
  const summary = createDoctorSummary(state, new Date("2026-10-26T12:00:00Z"));
  assert.match(summary, /kullanıcının girdiği: 2 ml/);
  assert.match(summary, /doz önerisi değildir/);
});
