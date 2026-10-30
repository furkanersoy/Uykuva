import assert from "node:assert/strict";
import test from "node:test";
import { SLEEP_GUIDES } from "./sleepGuides";

test("offline sleep guides have unique IDs, age labels, summaries, and HTTPS sources", () => {
  assert.ok(SLEEP_GUIDES.length > 0);
  assert.equal(new Set(SLEEP_GUIDES.map((guide) => guide.id)).size, SLEEP_GUIDES.length);
  for (const guide of SLEEP_GUIDES) {
    assert.ok(guide.title.trim().length > 0);
    assert.ok(guide.age.trim().length > 0);
    assert.ok(guide.summary.trim().length >= 40);
    assert.ok(guide.source.trim().length > 0);
    assert.match(guide.url, /^https:\/\//);
  }
});

test("sleep education includes infant age changes and caregiver support", () => {
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "four-month-pattern"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "caregiver-rest"));
});

