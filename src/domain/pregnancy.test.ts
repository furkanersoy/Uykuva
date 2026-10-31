import assert from "node:assert/strict";
import test from "node:test";
import { estimatePregnancy, isDateOnly } from "./pregnancy";

function dateAfter(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

test("pregnancy estimate uses date-only calendar arithmetic and expected due date", () => {
  const today = new Date(2026, 5, 15, 12);
  const result = estimatePregnancy(dateAfter(today, 0), today)!;
  assert.equal(result.daysUntilDue, 0);
  assert.equal(result.week, 40);
  assert.equal(result.day, 0);
  assert.equal(result.trimester, 3);
});

test("pregnancy estimate marks trimester boundaries from gestational days", () => {
  const today = new Date(2026, 5, 15, 12);
  assert.equal(estimatePregnancy(dateAfter(today, 280), today)?.trimester, 1);
  assert.equal(estimatePregnancy(dateAfter(today, 182), today)?.trimester, 2);
  assert.equal(estimatePregnancy(dateAfter(today, 84), today)?.trimester, 3);
});

test("pregnancy estimate reports elapsed time after due date and withholds negative weeks", () => {
  const today = new Date(2026, 5, 15, 12);
  const overdue = estimatePregnancy(dateAfter(today, -7), today)!;
  assert.equal(overdue.daysUntilDue, -7);
  assert.equal(overdue.week, 41);
  assert.equal(overdue.day, 0);
  const early = estimatePregnancy(dateAfter(today, 281), today)!;
  assert.equal(early.weekAvailable, false);
  assert.equal(early.trimester, undefined);
});

test("date-only validation rejects impossible dates", () => {
  assert.equal(isDateOnly("2024-02-29"), true);
  assert.equal(isDateOnly("2025-02-29"), false);
  assert.equal(isDateOnly("2026-13-01"), false);
  assert.equal(estimatePregnancy("2026-02-30", new Date(2026, 0, 1)), undefined);
});
