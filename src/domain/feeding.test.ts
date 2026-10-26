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

test("next breast side alternates the latest recorded side", () => {
  assert.equal(nextBreastSide([feed(8, "left"), feed(10, "right")]), "left");
});
