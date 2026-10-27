import assert from "node:assert/strict";
import test from "node:test";
import { coachingDay, correctedAgeDays, createSleepCoachInsights, createSleepForecast, handoffSummary, median, sleepProgramStage } from "./sleep";
import { Baby, CareEvent } from "./types";
import { createInitialState } from "../data/seed";

const termBaby: Baby = { id: "b1", name: "Ada", birthDate: "2026-06-01", gestationalWeek: 40 };

test("median handles odd and even sets", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("corrected age accounts for prematurity during first two years", () => {
  const baby: Baby = { ...termBaby, gestationalWeek: 36 };
  assert.equal(correctedAgeDays(baby, new Date("2026-07-27T12:00:00")), 28);
});

test("forecast stays unavailable before week nine", () => {
  const baby: Baby = { ...termBaby, birthDate: "2026-09-15" };
  const result = createSleepForecast(baby, [], new Date("2026-10-26T12:00:00"));
  assert.equal(result.available, false);
});

test("forecast returns an explainable range after a completed sleep", () => {
  const events: CareEvent[] = [{
    id: "s1",
    kind: "sleep",
    startedAt: "2026-10-26T07:00:00",
    endedAt: "2026-10-26T08:00:00",
    caregiver: "Anne"
  }];
  const result = createSleepForecast(termBaby, events, new Date("2026-10-26T09:00:00"));
  assert.equal(result.available, true);
  assert.ok(result.start && result.end && result.start < result.end);
  assert.match(result.explanation, /yaşa göre/i);
});

test("forecast learns its center and range from saved suggestion outcomes", () => {
  const events: CareEvent[] = [24, 25, 26].map((day) => ({
    id: `suggested-${day}`,
    kind: "sleep",
    startedAt: `2026-10-${day}T10:15:00`,
    endedAt: `2026-10-${day}T10:35:00`,
    suggestedSleepWindowStartAt: `2026-10-${day}T09:50:00`,
    suggestedSleepWindowEndAt: `2026-10-${day}T10:10:00`,
    caregiver: "Anne"
  }));
  const now = new Date("2026-10-26T11:00:00");
  const wakeAt = new Date("2026-10-26T08:00:00");
  const baseline = createSleepForecast(termBaby, [], now, wakeAt);
  const personalized = createSleepForecast(termBaby, events, now, wakeAt);
  assert.equal(personalized.available, true);
  assert.equal(baseline.available, true);
  assert.ok(personalized.start && baseline.start && personalized.start > baseline.start);
  assert.ok(personalized.end && baseline.end && personalized.end < baseline.end);
  assert.match(personalized.explanation, /3 tahmin/i);
});

test("coaching plan is bounded to fourteen days", () => {
  assert.match(coachingDay(99, "gradual").title, /^14\. gün/);
});

test("sleep support stays foundational before six months", () => {
  const baby: Baby = { ...termBaby, birthDate: "2026-07-20" };
  const stage = sleepProgramStage(baby, new Date("2026-10-26T12:00:00"));
  assert.equal(stage.id, "newborn");
  assert.equal(stage.canReduceSupport, false);
});

test("bedtime adjustment is capped at fifteen minutes", () => {
  const events: CareEvent[] = [{ id: "night", kind: "sleep", startedAt: "2026-10-25T21:00:00", endedAt: "2026-10-26T03:00:00", caregiver: "Anne" }];
  const insight = createSleepCoachInsights(events, "20:00", [{ date: "2026-10-26", ease: 2 }, { date: "2026-10-25", ease: 4 }], new Date("2026-10-26T12:00:00"));
  assert.equal(insight.actualBedtime, "21:00");
  assert.equal(insight.suggestedBedtime, "20:45");
  assert.equal(insight.adjustmentMinutes, -15);
  assert.equal(insight.checkInAverage, 3);
});
test("care handoff calls out the latest feed, diaper, and sleep times", () => {
  const state = createInitialState();
  state.careInstructions = "";
  state.sleepPlan.checkIns = [{ date: "2026-10-27", nightWakeLogs: [{ id: "wake", at: "2026-10-27T10:45:00", response: "feeding", caregiver: "Baba" }] }];
  state.events = [
    { id: "feed", kind: "feed", feedType: "bottle", amountMl: 90, startedAt: "2026-10-27T09:05:00", caregiver: "Baba" },
    { id: "diaper", kind: "diaper", diaperType: "wet", startedAt: "2026-10-27T09:10:00", caregiver: "Anne" },
    { id: "sleep", kind: "sleep", sleepSupport: "held", startedAt: "2026-10-27T08:00:00", endedAt: "2026-10-27T09:00:00", caregiver: "Anne" }
  ];
  const summary = handoffSummary(state, new Date("2026-10-27T12:00:00"), 4);
  assert.match(summary, /Son beslenme 09:05 · biberon · 90 ml · Baba/);
  assert.match(summary, /Son bez 09:10 · ıslak · Anne/);
  assert.match(summary, /Son uyku 08:00–09:00 · Kucakta/);
  assert.match(summary, /1 gece uyanması kaydı · son 10:45 Beslenme · Baba/);
});
test("sleep insights summarize recorded settling support neutrally", () => {
  const events: CareEvent[] = [
    { id: "s1", kind: "sleep", sleepSupport: "held", startedAt: "2026-10-26T20:00:00", endedAt: "2026-10-27T01:00:00", caregiver: "Anne" },
    { id: "s2", kind: "sleep", sleepSupport: "feeding", startedAt: "2026-10-25T20:00:00", endedAt: "2026-10-26T01:00:00", caregiver: "Anne" },
    { id: "s3", kind: "sleep", sleepSupport: "held", startedAt: "2026-10-24T20:00:00", endedAt: "2026-10-25T01:00:00", caregiver: "Baba" }
  ];
  const insight = createSleepCoachInsights(events, "20:00", [], new Date("2026-10-27T12:00:00"));
  assert.equal(insight.sleepSupportSamples, 3);
  assert.equal(insight.sleepSupportSummary, "Kucakta 2, Beslenerek 1");
});
