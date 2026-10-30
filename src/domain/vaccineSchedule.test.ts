import assert from "node:assert/strict";
import test from "node:test";
import { completedAgeMonths, suggestedVaccineTasks, TURKEY_CHILDHOOD_VACCINE_MILESTONES } from "./vaccineSchedule";

test("completed calendar age handles month ends and leap years", () => {
  assert.equal(completedAgeMonths("2022-08-31", new Date(2026, 8, 29, 9)), 48);
  assert.equal(completedAgeMonths("2022-08-31", new Date(2026, 8, 30, 9)), 49);
  assert.equal(completedAgeMonths("2024-01-31", new Date(2024, 1, 29, 9)), 1);
  assert.equal(completedAgeMonths("2024-01-31", new Date(2024, 1, 28, 9)), 0);
});

test("invalid birth dates do not produce an age or vaccine suggestions", () => {
  const now = new Date(2026, 8, 30, 12);
  assert.equal(completedAgeMonths("2026-02-31", now), -1);
  assert.deepEqual(suggestedVaccineTasks("2026-02-31", [], now), []);
});

test("the 48-month varicella second dose follows the official schedule update", () => {
  assert.ok(TURKEY_CHILDHOOD_VACCINE_MILESTONES.some((item) => item.id === "varicella-48m" && item.ageMonths === 48 && item.title === "Suçiçeği · 2. doz"));
});

test("vaccine suggestions use clamped calendar month dates and avoid duplicate titles", () => {
  const now = new Date(2026, 8, 1, 9);
  const suggestions = suggestedVaccineTasks("2026-08-31", [], now);
  const bcg = suggestions.find((item) => item.id === "bcg-2m");
  assert.equal(bcg?.dueAt.getFullYear(), 2026);
  assert.equal(bcg?.dueAt.getMonth(), 9);
  assert.equal(bcg?.dueAt.getDate(), 31);
  assert.equal(suggestedVaccineTasks("2026-08-31", ["BCG (Verem)"], now).some((item) => item.id === "bcg-2m"), false);
});

