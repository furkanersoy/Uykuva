import assert from "node:assert/strict";
import test from "node:test";
import { coachingDay, correctedAgeDays, correctedAgeMonths, createAwakeWindowInsights, createSleepCoachGuidance, createSleepCoachInsights, createSleepForecast, handoffSummary, hasSleepSinceWake, isSleepPlanPausedToday, median, methodDescription, sleepDayContextLabel, sleepProgramStage, SLEEP_READINESS_ITEMS, wakeWindowGuide } from "./sleep";
import { Baby, CareEvent, SleepMethod } from "./types";
import { createInitialState } from "../data/seed";

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
  state.sleepPlan.checkIns = [{ date: "2026-10-27", nightWakeLogs: [{ id: "wake", at: "2026-10-27T10:45:00", response: "feeding", caregiver: "Baba" }] }];
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
