import assert from "node:assert/strict";
import test from "node:test";
import { isInQuietHours, isValidClock } from "./time";

test("quiet hours work across midnight", () => {
  assert.equal(isInQuietHours(new Date("2026-10-26T23:00:00"), "21:00", "07:00"), true);
  assert.equal(isInQuietHours(new Date("2026-10-26T12:00:00"), "21:00", "07:00"), false);
});

test("clock validation rejects invalid input", () => {
  assert.equal(isValidClock("07:30"), true);
  assert.equal(isValidClock("25:00"), false);
  assert.equal(isValidClock("7:30"), false);
});
