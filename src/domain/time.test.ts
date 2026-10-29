import assert from "node:assert/strict";
import test from "node:test";
import { clockInputDigits, dailyReminderDatesBefore, isInQuietHours, isTodayTimeReached, isValidClock, normalizeClockInput } from "./time";

test("quiet hours work across midnight", () => {
  assert.equal(isInQuietHours(new Date("2026-10-26T23:00:00"), "21:00", "07:00"), true);
  assert.equal(isInQuietHours(new Date("2026-10-26T12:00:00"), "21:00", "07:00"), false);
});

test("clock validation rejects invalid input", () => {
  assert.equal(isValidClock("07:30"), true);
  assert.equal(isValidClock("25:00"), false);
  assert.equal(isValidClock("7:30"), false);
});

test("today's actual wake time cannot be later than the current local minute", () => {
  const now = new Date(2026, 9, 30, 7, 30, 15);
  assert.equal(isTodayTimeReached("07:29", now), true);
  assert.equal(isTodayTimeReached("07:30", now), true);
  assert.equal(isTodayTimeReached("07:31", now), false);
  assert.equal(isTodayTimeReached("23:59", now), false);
  assert.equal(isTodayTimeReached("25:00", now), false);
  assert.equal(isTodayTimeReached("07:00", new Date(NaN)), false);
});

test("morning wake input accepts common clock formats", () => {
  assert.equal(normalizeClockInput("0700"), "07:00");
  assert.equal(normalizeClockInput("7:00"), "07:00");
  assert.equal(normalizeClockInput("730"), "07:30");
  assert.equal(normalizeClockInput("12:45"), "12:45");
  assert.equal(isValidClock(normalizeClockInput("7:00")), true);
});

test("clock entry preserves digits while a four-digit time is still being typed", () => {
  assert.equal(clockInputDigits("16"), "16");
  assert.equal(clockInputDigits("16:0"), "160");
  assert.equal(normalizeClockInput(clockInputDigits("16:00")), "16:00");
  assert.equal(clockInputDigits("25:006"), "2500");
});

test("daily reminders are planned before the next clock time and omit times already passed", () => {
  const now = new Date("2026-10-27T18:00:00");
  const reminders = dailyReminderDatesBefore("21:00", 30, 3, now);
  assert.deepEqual(reminders.map((date) => date.toISOString()), [
    new Date("2026-10-27T20:30:00").toISOString(),
    new Date("2026-10-28T20:30:00").toISOString(),
    new Date("2026-10-29T20:30:00").toISOString()
  ]);
  assert.deepEqual(dailyReminderDatesBefore("21:00", 30, 2, new Date("2026-10-27T20:45:00")).map((date) => date.toISOString()), [new Date("2026-10-28T20:30:00").toISOString()]);
  assert.deepEqual(dailyReminderDatesBefore("25:00", 30, 3, now), []);
});
