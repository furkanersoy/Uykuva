import assert from "node:assert/strict";
import test from "node:test";
import { createFeedingForecast, nextBreastSide } from "./feeding";
import { CareEvent } from "./types";

function feed(hour: number, side?: "left" | "right"): CareEvent {
  return { id: String(hour), kind: "feed", feedType: side ? "breast" : "bottle", breastSide: side, startedAt: `2026-10-26T${String(hour).padStart(2, "0")}:00:00`, caregiver: "Anne" };
}

test("feeding forecast uses recorded intervals", () => {
  const result = createFeedingForecast([feed(7), feed(10), feed(13), feed(16)], new Date("2026-10-26T16:30:00"));
  assert.equal(result.available, true);
  assert.equal(result.start?.getHours(), 18);
  assert.equal(result.end?.getHours(), 19);
});

test("a solid meal does not replace the next milk-feeding forecast", () => {
  const events: CareEvent[] = [
    feed(7), feed(10), feed(13),
    feed(16), { id: "solid", kind: "feed", feedType: "solid", startedAt: "2026-10-26T16:30:00", caregiver: "Anne" }
  ];
  const result = createFeedingForecast(events, new Date("2026-10-26T16:40:00"));
  assert.equal(result.available, true);
  assert.equal(result.start?.getHours(), 18);
  assert.equal(result.start?.getMinutes(), 35);
  assert.match(result.explanation, /süt beslenmesi/);
});

test("feeding forecast does not borrow solid-meal intervals when there are too few milk feeds", () => {
  const events: CareEvent[] = [feed(7), feed(10), feed(13), ...[12, 13, 14, 15].map((hour, index): CareEvent => ({ id: `solid-${index}`, kind: "feed", feedType: "solid", startedAt: `2026-10-26T${String(hour).padStart(2, "0")}:30:00`, caregiver: "Anne" }))];
  const result = createFeedingForecast(events, new Date("2026-10-26T15:40:00"));
  assert.equal(result.available, false);
  assert.match(result.explanation, /süt beslenmesi aralığı için en az 4/);
});

test("feeding forecast ignores future records and keeps its 30-day learning window", () => {
  const events: CareEvent[] = [
    ...[7, 10, 13].map((hour, index): CareEvent => ({ ...feed(hour), id: `old-${index}`, startedAt: `2026-09-01T${String(hour).padStart(2, "0")}:00:00` })),
    { ...feed(16), id: "recent", startedAt: "2026-10-26T16:00:00" },
    { id: "future-solid", kind: "feed", feedType: "solid", startedAt: "2026-10-26T18:00:00", caregiver: "Anne" }
  ];
  const result = createFeedingForecast(events, new Date("2026-10-26T16:40:00"));
  assert.equal(result.available, false);
  assert.match(result.explanation, /süt beslenmesi aralığı için en az 4 benzer kayıt/);
});

test("feeding forecast ignores malformed timestamps", () => {
  const events: CareEvent[] = [feed(7), feed(10), feed(13), {
    id: "invalid", kind: "feed", feedType: "bottle", startedAt: "not-a-date", caregiver: "Anne"
  }];
  const result = createFeedingForecast(events, new Date("2026-10-26T13:30:00"));
  assert.equal(result.available, false);
  assert.match(result.explanation, /süt beslenmesi aralığı için en az 4 benzer kayıt/);
});

test("next breast side alternates the latest recorded side", () => {
  assert.equal(nextBreastSide([feed(8, "left"), feed(10, "right")]), "left");
});
test("next breast side uses the last timed side when a feed contains multiple sessions", () => {
  const event: CareEvent = {
    id: "multi-side", kind: "feed", feedType: "breast", breastSide: "both", startedAt: "2026-10-26T08:00:00", caregiver: "Anne",
    breastSessions: [
      { side: "left", startedAt: "2026-10-26T08:00:00", endedAt: "2026-10-26T08:08:00" },
      { side: "right", startedAt: "2026-10-26T08:09:00", endedAt: "2026-10-26T08:17:00" }
    ]
  };
  assert.equal(nextBreastSide([event]), "left");
});

