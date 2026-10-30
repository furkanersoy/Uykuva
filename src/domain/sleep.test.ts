import assert from "node:assert/strict";
import test from "node:test";
import { coachingDay, coachingWeek, compareSleepPlanCheckIns, correctedAgeDays, correctedAgeMonths, createAwakeWindowInsights, createSleepCoachGuidance, createSleepCoachInsights, createSleepForecast, estimateSleepWakeWindow, handoffSummary, hasSleepSinceWake, isSleepPlanPausedToday, median, methodDescription, recommendSleepMethods, sleepDayContextLabel, sleepMinutesBetween, sleepProgramStage, SLEEP_READINESS_GUIDANCE, SLEEP_READINESS_ITEMS, summarizeNightWakeResponses, wakeWindowGuide, weeklySleepTotals } from "./sleep";
import { Baby, CareEvent, SleepMethod } from "./types";
import { createInitialState } from "../data/seed";
import { detectRecordedMilestones } from "./milestones";

test("wake-time-only check-ins do not hide a recent difficult night", () => {
  const guidance = createSleepCoachGuidance([
    { date: "2026-10-30", wakeTime: "07:00" },
    { date: "2026-10-29", nightWakings: 5 }
  ], new Date(2026, 9, 30, 12));
  assert.equal(guidance?.title, "Sık uyanma bildirildi");
  assert.equal(createSleepCoachGuidance([{ date: "2026-10-30" }], new Date(2026, 9, 30, 12)), undefined);
});

test("empty check-ins do not displace the last recorded sleep ratings", () => {
  const empty = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-${String(30 - index).padStart(2, "0")}` }));
  const insights = createSleepCoachInsights([], "20:00", [...empty, { date: "2026-10-23", ease: 2, nightWakings: 3, bedtime: "20:30" }], new Date(2026, 9, 30, 12));
  assert.equal(insights.checkInAverage, 2);
  assert.equal(insights.nightWakingsAverage, 3);
  assert.equal(insights.actualBedtime, "20:30");
});

test("sleep coach uses repeated low sustainability ratings to suggest simplifying the plan", () => {
  const now = new Date(2026, 9, 30, 12);
  const guidance = createSleepCoachGuidance([
    { date: "2026-10-30", sustainability: 2 },
    { date: "2026-10-29", sustainability: 1 },
    { date: "2026-10-28", sustainability: 4 }
  ], now);
  assert.equal(guidance?.title, "Planı ailenize göre sadeleştirin");
  assert.match(guidance?.body ?? "", /görevleri paylaşın veya planı duraklatın/);

  assert.equal(createSleepCoachGuidance([{ date: "2026-10-30", sustainability: 1 }], now), undefined);
});

test("sleep coaching ignores impossible calendar dates in check-ins", () => {
  const now = new Date(2026, 2, 3, 12);
  assert.equal(createSleepCoachGuidance([{ date: "2026-03-03", ease: 4 }, { date: "2026-02-31", nightWakings: 5 }], now)?.title, undefined);
  const insights = createSleepCoachInsights([], "20:00", [{ date: "2026-02-31", ease: 1, nightWakings: 5, bedtime: "19:00" }], now);
  assert.equal(insights.checkInAverage, undefined);
  assert.equal(insights.nightWakingsAverage, undefined);
  assert.equal(insights.actualBedtime, undefined);
});

test("repeated logged night responses give neutral caregiver handoff guidance", () => {
  const guidance = createSleepCoachGuidance([
    { date: "2026-10-30", nightWakeLogs: [
      { id: "feed-1", at: "2026-10-30T01:00:00", response: "feeding", caregiver: "Anne" },
      { id: "feed-2", at: "2026-10-30T03:00:00", response: "feeding", caregiver: "Baba" },
      { id: "feed-2", at: "2026-10-30T03:00:00", response: "comfort", caregiver: "Baba" }
    ] }
  ], new Date(2026, 9, 30, 7));
  assert.equal(guidance?.title, "Gece yanıtlarını bakım verenle gözden geçirin");
  assert.match(guidance?.body ?? "", /beslenme 2 kez/);
  assert.match(guidance?.body ?? "", /geciktirmeyin/);
});

test("night response guidance ignores future wake logs", () => {
  const guidance = createSleepCoachGuidance([
    { date: "2026-10-30", nightWakeLogs: [
      { id: "future-1", at: "2026-10-30T08:00:00", response: "comfort", caregiver: "Anne" },
      { id: "future-2", at: "2026-10-30T09:00:00", response: "comfort", caregiver: "Baba" }
    ] }
  ], new Date(2026, 9, 30, 7));
  assert.equal(guidance, undefined);
});

test("overlapping sleep records use the end of the combined sleep for awake windows", () => {
  const events: CareEvent[] = Array.from({ length: 5 }, (_, index) => {
    const date = `2026-10-${23 + index}`;
    return [
      { id: `long-${index}`, kind: "sleep" as const, startedAt: `${date}T09:00:00`, endedAt: `${date}T12:00:00`, caregiver: "Anne" },
      { id: `nested-${index}`, kind: "sleep" as const, startedAt: `${date}T10:00:00`, endedAt: `${date}T10:30:00`, caregiver: "Baba" },
      { id: `next-${index}`, kind: "sleep" as const, startedAt: `${date}T13:00:00`, endedAt: `${date}T13:30:00`, caregiver: "Anne" }
    ];
  }).flat();
  const midday = createAwakeWindowInsights(events, new Date("2026-10-27T15:00:00")).find((item) => item.part === "midday");
  assert.equal(midday?.sampleCount, 5);
  assert.equal(midday?.medianMinutes, 60);
});

test("sleep totals merge overlapping and ongoing records across midnight", () => {
  const events: CareEvent[] = [
    { id: "night", kind: "sleep", startedAt: "2026-10-26T23:00:00", endedAt: "2026-10-27T02:00:00", caregiver: "Anne" },
    { id: "nested", kind: "sleep", startedAt: "2026-10-27T00:30:00", endedAt: "2026-10-27T01:00:00", caregiver: "Baba" },
    { id: "ongoing", kind: "sleep", startedAt: "2026-10-27T01:30:00", caregiver: "Anne" }
  ];
  const now = new Date("2026-10-27T02:30:00");
  assert.equal(sleepMinutesBetween(events, new Date("2026-10-27T00:00:00"), now), 150);
  const totals = weeklySleepTotals(events, now);
  assert.equal(totals.find((day) => day.date === "2026-10-26")?.totalMinutes, 60);
  assert.equal(totals.find((day) => day.date === "2026-10-27")?.totalMinutes, 150);
  const state = createInitialState();
  state.events = events;
  assert.match(handoffSummary(state, now, 4), /Son 4 saatte 210 dk uyku/);
});

test("wake estimates require five completed similar sleeps and ignore future endings", () => {
  const now = new Date("2026-10-27T12:10:00");
  const running: CareEvent = { id: "running", kind: "sleep", startedAt: "2026-10-27T12:00:00", caregiver: "Anne" };
  const past: CareEvent[] = Array.from({ length: 5 }, (_, index) => ({ id: `past-${index}`, kind: "sleep", startedAt: `2026-10-${20 + index}T12:00:00`, endedAt: `2026-10-${20 + index}T13:00:00`, caregiver: "Anne" }));
  const futureEnding: CareEvent = { id: "future-ending", kind: "sleep", startedAt: "2026-10-27T12:05:00", endedAt: "2026-10-27T13:00:00", caregiver: "Anne" };
  const insufficient = estimateSleepWakeWindow([...past.slice(0, 4), futureEnding], running, now);
  assert.equal(insufficient.available, false);
  assert.equal(insufficient.sampleCount, 4);
  const enough = estimateSleepWakeWindow(past, running, now);
  assert.equal(enough.available, true);
  assert.equal(enough.typical?.getTime(), new Date("2026-10-27T13:00:00").getTime());
  const justStarted = estimateSleepWakeWindow(past, { ...running, startedAt: "2026-10-27T12:10:20" }, now);
  assert.equal(justStarted.available, true);
  assert.equal(justStarted.typical?.getTime(), new Date("2026-10-27T13:10:20").getTime());
  const impossibleFuture = estimateSleepWakeWindow(past, { ...running, startedAt: "2026-10-27T12:12:00" }, now);
  assert.equal(impossibleFuture.available, false);
  assert.match(impossibleFuture.explanation, /başlangıç saati kontrol edilemiyor/i);
  assert.equal(estimateSleepWakeWindow(past, undefined, now).available, false);
});
const termBaby: Baby = { id: "b1", name: "Ada", birthDate: "2026-06-01", gestationalWeek: 40 };

test("median handles odd and even sets", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("corrected age accounts for prematurity during first two years", () => {
  const baby: Baby = { ...termBaby, gestationalWeek: 36 };
  assert.equal(correctedAgeDays(baby, new Date("2026-07-27T12:00:00")), 28);
});

test("corrected calendar age recognizes month-end anniversaries", () => {
  const monthEndBaby: Baby = { ...termBaby, birthDate: "2026-01-31" };
  assert.equal(correctedAgeMonths(monthEndBaby, new Date("2026-02-28T12:00:00")), 1);
  assert.equal(correctedAgeMonths(monthEndBaby, new Date("2026-03-30T12:00:00")), 1);
  assert.equal(correctedAgeMonths(monthEndBaby, new Date("2026-03-31T12:00:00")), 2);
});

test("wake-window guide highlights the age band used for forecasts, including corrected age", () => {
  const now = new Date("2026-10-26T12:00:00");
  const guide = wakeWindowGuide(termBaby, now);
  assert.equal(guide.length, 8);
  assert.deepEqual(guide.filter((row) => row.current).map((row) => row.ageLabel), ["4–6 ay"]);
  assert.equal(guide.find((row) => row.current)?.minMinutes, 90);

  const pretermBaby = { ...termBaby, birthDate: "2026-07-18", gestationalWeek: 32 };
  const pretermGuide = wakeWindowGuide(pretermBaby, now);
  assert.deepEqual(pretermGuide.filter((row) => row.current).map((row) => row.ageLabel), ["0–2 ay"]);
});

test("awake-window insights share forecast thresholds and report the personal median only when ready", () => {
  const events: CareEvent[] = [];
  for (let index = 0; index < 5; index += 1) {
    const nightStart = new Date("2026-10-20T20:00:00");
    nightStart.setDate(nightStart.getDate() + index);
    const nightEnd = new Date(nightStart);
    nightEnd.setDate(nightEnd.getDate() + 1);
    nightEnd.setHours(7, 0, 0, 0);
    const napStart = new Date(nightEnd);
    napStart.setHours(9, 0, 0, 0);
    const napEnd = new Date(napStart);
    napEnd.setHours(10, 0, 0, 0);
    events.push(
      { id: `night-${index}`, kind: "sleep", startedAt: nightStart.toISOString(), endedAt: nightEnd.toISOString(), caregiver: "Anne" },
      { id: `nap-${index}`, kind: "sleep", startedAt: napStart.toISOString(), endedAt: napEnd.toISOString(), caregiver: "Anne" }
    );
  }
  const now = new Date("2026-10-27T12:00:00");
  const insights = createAwakeWindowInsights(events, now);
  const morning = insights.find((item) => item.part === "morning");
  assert.equal(insights.length, 6);
  assert.equal(morning?.sampleCount, 5);
  assert.equal(morning?.requiredSamples, 5);
  assert.equal(morning?.medianMinutes, 120);

  const limited = createAwakeWindowInsights(events.slice(0, 8), now).find((item) => item.part === "morning");
  assert.equal(limited?.sampleCount, 4);
  assert.equal(limited?.medianMinutes, undefined);
});

test("sleep coaching keeps support reduction closed before six months", () => {
  const threeMonthOld = { ...termBaby, birthDate: "2026-03-01" };
  const fiveMonthOld = { ...termBaby, birthDate: "2026-01-01" };
  const sixMonthOld = { ...termBaby, birthDate: "2025-11-30" };
  const now = new Date("2026-06-01T12:00:00");

  assert.equal(sleepProgramStage(threeMonthOld, now).id, "newborn");
  assert.equal(sleepProgramStage(threeMonthOld, now).canReduceSupport, false);
  assert.equal(sleepProgramStage(fiveMonthOld, now).id, "foundations");
  assert.equal(sleepProgramStage(fiveMonthOld, now).canReduceSupport, false);
  assert.equal(sleepProgramStage(sixMonthOld, now).id, "plan");
  assert.equal(sleepProgramStage(sixMonthOld, now).canReduceSupport, true);
});

test("all seven sleep coaching approaches include caregiver and night-waking guidance", () => {
  const methods: SleepMethod[] = ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"];
  for (const method of methods) {
    const guidance = methodDescription(method);
    assert.ok(guidance.name.length > 0);
    assert.ok(guidance.support.length > 0);
    assert.ok(guidance.caregiverRole.length > 0);
    assert.ok(guidance.nightResponse.length > 0);
  }
});

test("sleep-method matching waits for all choices and only suggests age-allowed methods", () => {
  assert.equal(recommendSleepMethods({ caregiverPresence: "near" }, ["responsive", "gradual"]), undefined);
  const responseLed = recommendSleepMethods({ caregiverPresence: "near", responseStyle: "prompt", changePace: "keepSupport" }, ["responsive", "gradual", "timedChecks", "pickUpPutDown"]);
  assert.deepEqual(responseLed?.methods, ["pickUpPutDown", "responsive"]);
  assert.match(responseLed?.reason ?? "", /hızlı yanıt/i);

  const plannedVisit = recommendSleepMethods({ caregiverPresence: "briefVisits", responseStyle: "plannedChecks", changePace: "gradualChange" }, ["responsive", "gradual", "timedChecks"]);
  assert.deepEqual(plannedVisit?.methods, ["timedChecks", "gradual"]);
  const beforeReadiness = recommendSleepMethods({ caregiverPresence: "briefVisits", responseStyle: "plannedChecks", changePace: "gradualChange" }, ["responsive"]);
  assert.deepEqual(beforeReadiness?.methods, ["responsive"]);
});

test("each sleep-plan readiness item explains its safety and caregiver context", () => {
  assert.deepEqual(Object.keys(SLEEP_READINESS_GUIDANCE).sort(), [...SLEEP_READINESS_ITEMS].sort());
  for (const item of SLEEP_READINESS_ITEMS) assert.ok(SLEEP_READINESS_GUIDANCE[item].length > 20);
});

test("night-wake response summary counts unique recent logs and ignores future or malformed entries", () => {
  const summary = summarizeNightWakeResponses([
    { nightWakeLogs: [
      { id: "feed", at: "2026-10-30T02:00:00", response: "feeding", caregiver: "Anne" },
      { id: "comfort", at: "2026-10-29T23:00:00", response: "comfort", caregiver: "Baba" },
      { id: "duplicate", at: "2026-10-30T03:00:00", response: "diaper", caregiver: "Anne" },
      { id: "bad-time", at: "invalid", response: "other", caregiver: "Anne" },
      { id: "future", at: "2026-10-30T13:00:00", response: "other", caregiver: "Anne" },
      { id: "old", at: "2026-10-23T23:59:00", response: "diaper", caregiver: "Anne" }
    ] },
    { nightWakeLogs: [{ id: "duplicate", at: "2026-10-30T03:00:00", response: "diaper", caregiver: "Anne" }] }
  ], new Date(2026, 9, 30, 12));
  assert.deepEqual(summary, { total: 3, daysWithLogs: 2, counts: { feeding: 1, comfort: 1, diaper: 1, other: 0 } });
});

test("forecast stays unavailable before week nine", () => {
  const baby: Baby = { ...termBaby, birthDate: "2026-09-15" };
  const result = createSleepForecast(baby, [], new Date("2026-10-26T12:00:00"));
  assert.equal(result.available, false);
});

test("parent-entered morning wake time enables a cautious first window before week nine", () => {
  const baby: Baby = { ...termBaby, birthDate: "2026-09-15" };
  const result = createSleepForecast(baby, [], new Date("2026-10-26T12:00:00"), new Date("2026-10-26T07:00:00"));
  assert.equal(result.available, true);
  assert.equal(result.confidence, "low");
  assert.ok(result.start && result.end && result.start < result.end);
});

test("a future morning wake time does not create a sleep window", () => {
  const now = new Date("2026-10-26T06:30:00");
  const result = createSleepForecast(termBaby, [], now, new Date("2026-10-26T07:00:00"));
  assert.equal(result.available, false);
  assert.match(result.explanation, /ileride olamaz/i);
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

test("morning wake forecast advances after a sleep is recorded since wake", () => {
  const wakeAt = new Date("2026-10-26T07:00:00");
  const priorNight: CareEvent = { id: "prior", kind: "sleep", startedAt: "2026-10-25T20:00:00", endedAt: "2026-10-26T06:30:00", caregiver: "Anne" };
  const nightEndingAtWake: CareEvent = { ...priorNight, id: "night-at-wake", endedAt: "2026-10-26T07:00:00" };
  const overlap: CareEvent = { ...priorNight, id: "overlap", endedAt: "2026-10-26T07:01:00" };
  const firstNap: CareEvent = { id: "nap", kind: "sleep", startedAt: "2026-10-26T09:00:00", endedAt: "2026-10-26T09:40:00", caregiver: "Anne" };
  const ongoingNap: CareEvent = { id: "ongoing", kind: "sleep", startedAt: "2026-10-26T09:00:00", caregiver: "Anne" };
  assert.equal(hasSleepSinceWake([priorNight], wakeAt), false);
  assert.equal(hasSleepSinceWake([nightEndingAtWake], wakeAt), false);
  assert.equal(hasSleepSinceWake([overlap], wakeAt), true);
  assert.equal(hasSleepSinceWake([firstNap], wakeAt), true);
  assert.equal(hasSleepSinceWake([ongoingNap], wakeAt), true);
});

test("day context pauses sleep windows on illness, travel, teething, or routine changes", () => {
  const now = new Date("2026-10-26T09:00:00");
  for (const context of ["illness", "travel", "teething", "routineChange"] as const) {
    const result = createSleepForecast(termBaby, [], now, new Date("2026-10-26T08:00:00"), context);
    assert.equal(result.available, false);
    assert.match(result.explanation, /duraklatıldı/i);
  }
});

test("a non-routine day pauses coaching progress without changing the saved plan pause setting", () => {
  const plan = { paused: false, checkIns: [{ date: "2026-10-27", dayContext: "illness" as const }] };
  assert.equal(isSleepPlanPausedToday(plan, "2026-10-27"), true);
  assert.equal(isSleepPlanPausedToday(plan, "2026-10-28"), false);
  assert.equal(isSleepPlanPausedToday({ paused: true, checkIns: [] }, "2026-10-27"), true);
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

test("shared sleep coaching week follows the selected approach and stops at day fourteen", () => {
  const week = coachingWeek(4, "gradual", true, 220, "naps");
  assert.equal(week.length, 7);
  assert.match(week[0]!.title, /^4\. gün/);
  assert.match(week[0]!.title, /Kademeli/);
  assert.equal(week.at(-1)?.title.startsWith("10."), true);
  assert.ok(week.every((item) => item.tasks.length > 0 && item.checkIn.length > 0));
  assert.equal(coachingWeek(12, "routineFirst").length, 3);
  assert.equal(coachingWeek(14, "routineFirst").length, 1);
});

test("shared sleep coaching week can skip an exceptional paused day", () => {
  const week = coachingWeek(4, "responsive", false, 100, "nightWakings", true);
  assert.equal(week.length, 7);
  assert.match(week[0]!.title, /^5\. gün/);
  assert.ok(week.every((item) => item.tasks.length > 0));
  assert.equal(coachingWeek(14, "responsive", false, 100, "routine", true).length, 0);
});

test("each sleep approach gets distinct tasks throughout all coaching phases", () => {
  const methods: SleepMethod[] = ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"];
  for (const day of [2, 5, 8, 12]) {
    const plans = methods.map((method) => coachingDay(day, method, true, 183, "routine"));
    assert.equal(new Set(plans.map((plan) => plan.tasks.join("\n"))).size, methods.length, `day ${day} must differ by approach`);
    plans.forEach((plan, index) => assert.match(plan.title, new RegExp(methodDescription(methods[index]!).name)));
  }
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

test("sleep coach summarizes bedtime-to-sleep onset time across matching nights", () => {
  const records = [
    { date: "2026-10-30", bedtime: "20:00" },
    { date: "2026-10-29", bedtime: "20:00" },
    { date: "2026-10-28", bedtime: "20:00" },
    { date: "2026-10-23", bedtime: "20:00" },
    { date: "2026-10-22", bedtime: "20:00" },
    { date: "2026-10-21", bedtime: "20:00" },
    { date: "2026-10-31", bedtime: "20:00" },
    { date: "2026-10-24", bedtime: "25:00" }
  ];
  const minutes = [30, 45, 15, 80, 70, 90];
  const events: CareEvent[] = records.slice(0, 6).map((record, index) => {
    const bedtime = new Date(`${record.date}T12:00:00`);
    bedtime.setDate(bedtime.getDate() - 1);
    bedtime.setHours(20, 0, 0, 0);
    const start = new Date(bedtime.getTime() + minutes[index]! * 60_000);
    return { id: `onset-${index}`, kind: "sleep", startedAt: start.toISOString(), endedAt: new Date(start.getTime() + 5 * 60 * 60_000).toISOString(), caregiver: "Anne" };
  });

  const insight = createSleepCoachInsights(events, "20:00", records, new Date(2026, 9, 30, 12));

  assert.equal(insight.sleepOnsetSamples, 3);
  assert.equal(insight.sleepOnsetMedianMinutes, 30);
  assert.equal(insight.previousSleepOnsetSamples, 3);
  assert.equal(insight.previousSleepOnsetMedianMinutes, 80);
  assert.equal(insight.sleepOnsetChangeMinutes, -50);
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

test("care handoff calls out the latest feed, diaper, and sleep times", () => {
  const state = createInitialState();
  state.careInstructions = "";
  state.sleepPlan.checkIns = [{ date: "2026-10-27", nightWakeLogs: [
    { id: "wake", at: "2026-10-27T10:45:00", response: "feeding", caregiver: "Baba" },
    { id: "wake-before", at: "2026-10-26T23:00:00", response: "comfort", caregiver: "Anne" }
  ] }];
  state.events = [
    { id: "feed", kind: "feed", feedType: "bottle", amountMl: 90, startedAt: "2026-10-27T09:05:00", caregiver: "Baba" },
    { id: "diaper", kind: "diaper", diaperType: "wet", startedAt: "2026-10-27T09:10:00", caregiver: "Anne" },
    { id: "sleep", kind: "sleep", sleepSupport: "held", startedAt: "2026-10-27T08:00:00", endedAt: "2026-10-27T09:00:00", caregiver: "Anne" }
  ];
  const summary = handoffSummary(state, new Date("2026-10-27T12:00:00"), 4);
  assert.match(summary, /Son beslenme 09:05 · biberon · 90 ml · Baba/);
  assert.match(summary, /\n• Son beslenme 09:05/);
  assert.match(summary, /Son bez 09:10 · ıslak · Anne/);
  assert.match(summary, /Son uyku 08:00–09:00 · Kucakta/);
  assert.match(summary, /1 gece uyanması kaydı · son 10:45 Beslenme · Baba/);
  assert.match(summary, /Son 7 günde saatli uyanma yanıtları: Beslenme 1, Sakinleştirme \/ yakınlık 1/);
});

test("care handoff names the person assigned to an upcoming appointment", () => {
  const state = createInitialState();
  state.careTasks = [{ id: "appointment", type: "appointment", title: "Çocuk doktoru", dueAt: "2026-10-30T13:00:00", assignedCaregiverId: "caregiver-1" }];
  const summary = handoffSummary(state, new Date("2026-10-30T12:00:00"), 4);
  assert.match(summary, /Çocuk doktoru.*sorumlu Anne/);
});

test("care handoff shares unfinished sleep coaching tasks with the next caregiver", () => {
  const state = createInitialState();
  state.baby.birthDate = "2025-01-01";
  state.sleepPlan.method = "gradual";
  state.sleepPlan.readinessCompleted = [...SLEEP_READINESS_ITEMS];
  const todayPlan = coachingDay(state.sleepPlan.day, "gradual", true, correctedAgeDays(state.baby, new Date("2026-10-30T12:00:00")), state.sleepPlan.focus);
  state.sleepPlan.completedToday = [todayPlan.tasks[0]!];
  const summary = handoffSummary(state, new Date("2026-10-30T12:00:00"), 4);

  assert.match(summary, /Uyku yaklaşımı: Kademeli destek/);
  assert.ok(summary.includes(todayPlan.tasks[1]!));
  assert.ok(!summary.includes(todayPlan.tasks[0]!));

  state.sleepPlan.paused = true;
  assert.doesNotMatch(handoffSummary(state, new Date("2026-10-30T12:00:00"), 4), /Bugünün uyku planı/);
});

test("care handoff includes the next sleep window based on today's wake time or latest nap", () => {
  const state = createInitialState();
  state.baby = termBaby;
  state.sleepPlan.checkIns = [{ date: "2026-10-27", wakeTime: "07:00" }];
  state.events = [{ id: "nap", kind: "sleep", startedAt: "2026-10-27T08:30:00", endedAt: "2026-10-27T08:45:00", caregiver: "Anne" }];
  const now = new Date("2026-10-27T09:00:00");
  const summary = handoffSummary(state, now, 4);
  const expected = createSleepForecast(termBaby, state.events, now);
  assert.equal(expected.available, true);
  assert.ok(expected.start && expected.end);
  const expectedWindow = `${expected.start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}–${expected.end.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  const confidenceLabel = { low: "ilk tahmin", medium: "kişiselleşiyor", high: "kişisel ritim" }[expected.confidence];
  assert.match(summary, new RegExp(`Tahmini sonraki uyku penceresi ${expectedWindow} · ${confidenceLabel}`));
});

test("care handoff keeps the first wake window when overnight sleep ends exactly at wake time", () => {
  const state = createInitialState();
  state.baby = { ...termBaby, birthDate: "2026-10-10" };
  state.sleepPlan.checkIns = [{ date: "2026-10-27", wakeTime: "07:00" }];
  state.events = [{ id: "night", kind: "sleep", startedAt: "2026-10-26T20:00:00", endedAt: "2026-10-27T07:00:00", caregiver: "Anne" }];
  const now = new Date("2026-10-27T08:00:00");
  const wakeAt = new Date("2026-10-27T07:00:00");
  const expected = createSleepForecast(state.baby, state.events, now, wakeAt);
  assert.equal(expected.available, true);
  assert.ok(expected.start && expected.end);
  const expectedWindow = `${expected.start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}–${expected.end.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  assert.ok(handoffSummary(state, now, 4).includes(`Tahmini sonraki uyku penceresi ${expectedWindow}`));
});

test("care handoff says how much expressed milk is usable and which batch to use first", () => {
  const state = createInitialState();
  state.events = [
    { id: "warmed", kind: "feed", feedType: "pump", amountMl: 60, milkStorageLocation: "fridge", milkWarmedAt: "2026-10-27T11:00:00", startedAt: "2026-10-27T08:00:00", caregiver: "Anne" },
    { id: "fresh", kind: "feed", feedType: "pump", amountMl: 90, milkStorageLocation: "fridge", startedAt: "2026-10-27T09:00:00", caregiver: "Baba" }
  ];
  const summary = handoffSummary(state, new Date("2026-10-27T11:30:00"), 4);

  assert.match(summary, /Kullanılabilir süt stoğu 150 ml/);
  assert.match(summary, /önce 60 ml Isıtılmış \/ oda sıcaklığında · 2 sa, 13:00 saatine kadar kullanın/);
});

test("care handoff names today's exceptional context and paused sleep coaching", () => {
  const now = new Date("2026-10-27T12:00:00");
  for (const context of ["illness", "travel", "teething", "routineChange"] as const) {
    const state = createInitialState();
    state.sleepPlan.checkIns = [{ date: "2026-10-27", dayContext: context }];
    const summary = handoffSummary(state, now, 4);
    assert.ok(summary.includes(`Bugün ${sleepDayContextLabel(context)} işaretlendi · uyku tahmini ve koçluk planı beklemede`));
  }
});

test("care handoff includes the active sleep approach and evening routine", () => {
  const state = createInitialState();
  state.baby = { ...termBaby, birthDate: "2025-06-01" };
  state.sleepPlan.method = "gradual";
  state.sleepPlan.readinessCompleted = [...SLEEP_READINESS_ITEMS];
  state.sleepPlan.routine = [
    { id: "wind-down", label: "Işıkları azalt", minutes: 5, enabled: true },
    { id: "song", label: "Ninni", minutes: 5, enabled: true },
    { id: "off", label: "Devre dışı", minutes: 5, enabled: false }
  ];
  const now = new Date("2026-10-27T12:00:00");
  const active = handoffSummary(state, now);
  assert.match(active, /Hedef yatış: 20:00/);
  assert.match(active, /Uyku yaklaşımı: Kademeli destek/);
  assert.match(active, /Etkin akşam rutini: Işıkları azalt → Ninni/);
  assert.doesNotMatch(active, /Devre dışı/);

  state.sleepPlan.paused = true;
  const paused = handoffSummary(state, now);
  assert.match(paused, /Uyku planı duraklatıldı/);
  assert.doesNotMatch(paused, /Uyku yaklaşımı:/);
  assert.match(paused, /Etkin akşam rutini: Işıkları azalt → Ninni/);
});

test("sleep plan comparisons exclude explicitly reported nights using another approach", () => {
  const records = Array.from({ length: 6 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, "0")}`,
    day: index + 1,
    method: "gradual" as const,
    focus: "bedtime" as const,
    completedTasks: 2,
    totalTasks: 3
  }));
  const checkIns = records.map((record, index) => ({
    date: record.date,
    appliedMethod: index === 0 || index === 3 ? "routineFirst" as const : "gradual" as const,
    ease: 3 as const,
    sustainability: 4 as const,
    nightWakings: 2
  }));

  const comparison = compareSleepPlanCheckIns(records, checkIns, "gradual", "bedtime");
  assert.equal(comparison.firstEaseCount, 2);
  assert.equal(comparison.recentEaseCount, 2);
  assert.equal(comparison.firstWakingsCount, 2);
  assert.equal(comparison.recentWakingsCount, 2);
  assert.equal(comparison.firstSustainabilityCount, 2);
  assert.equal(comparison.recentSustainabilityCount, 2);
  assert.equal(comparison.firstSustainabilityAverage, 4);
  assert.equal(comparison.recentSustainabilityAverage, 4);
});

test("sleep plan comparisons retain older check-ins without a reported approach", () => {
  const records = Array.from({ length: 6 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, "0")}`,
    day: index + 1,
    method: "gradual" as const,
    focus: "bedtime" as const,
    completedTasks: 2,
    totalTasks: 3
  }));
  const checkIns = records.map((record) => ({ date: record.date, ease: 4 as const, nightWakings: 1 }));
  const comparison = compareSleepPlanCheckIns(records, checkIns, "gradual", "bedtime");
  assert.equal(comparison.firstEaseCount, 3);
  assert.equal(comparison.recentEaseCount, 3);
});

test("memory suggestions include thirteen factual care-log milestones", () => {
  const start = new Date("2026-10-01T08:00:00");
  const events = [
    { id: "breast", kind: "feed" as const, feedType: "breast" as const, startedAt: start.toISOString(), caregiver: "Anne" },
    { id: "bottle", kind: "feed" as const, feedType: "bottle" as const, startedAt: new Date(start.getTime() + 60_000).toISOString(), caregiver: "Anne" },
    { id: "solid", kind: "feed" as const, feedType: "solid" as const, startedAt: new Date(start.getTime() + 120_000).toISOString(), caregiver: "Anne" },
    { id: "pump", kind: "feed" as const, feedType: "pump" as const, startedAt: new Date(start.getTime() + 180_000).toISOString(), caregiver: "Anne" },
    { id: "diaper", kind: "diaper" as const, diaperType: "wet" as const, startedAt: new Date(start.getTime() + 240_000).toISOString(), caregiver: "Anne" },
    { id: "health", kind: "health" as const, healthType: "symptom" as const, startedAt: new Date(start.getTime() + 300_000).toISOString(), caregiver: "Anne" },
    { id: "growth", kind: "growth" as const, weightG: 5000, startedAt: new Date(start.getTime() + 360_000).toISOString(), caregiver: "Anne" },
    ...Array.from({ length: 10 }, (_, index) => ({ id: `sleep-${index}`, kind: "sleep" as const, startedAt: new Date(start.getTime() + (index + 1) * 3_600_000).toISOString(), endedAt: new Date(start.getTime() + (index + 1) * 3_600_000 + (index === 0 ? 4 : 1) * 3_600_000).toISOString(), caregiver: "Anne" })),
    ...Array.from({ length: 10 }, (_, index) => ({ id: `diaper-${index}`, kind: "diaper" as const, startedAt: new Date(start.getTime() + (index + 1) * 7_200_000).toISOString(), caregiver: "Anne" })),
    ...Array.from({ length: 99 }, (_, index) => ({ id: `feed-${index}`, kind: "feed" as const, feedType: "bottle" as const, startedAt: new Date(start.getTime() + (index + 1) * 60_000).toISOString(), caregiver: "Anne" }))
  ];
  const milestones = detectRecordedMilestones(events, new Date("2026-11-01T12:00:00"));
  const milestoneIds = new Set(milestones.map((milestone) => milestone.id));
  assert.equal(milestones.length, 13);
  for (const id of ["first_sleep_log", "first_feed_log", "first_breastfeed_log", "first_bottle_log", "first_solid_log", "first_pumping_log", "first_diaper_log", "first_health_log", "first_growth_log", "first_four_hour_sleep_log", "tenth_sleep_log", "tenth_diaper_log", "hundredth_feed_log"]) {
    assert.ok(milestoneIds.has(id), `missing milestone ${id}`);
  }
});
