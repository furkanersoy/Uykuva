import assert from "node:assert/strict";
import test from "node:test";
import { SLEEP_GUIDES, SLEEP_GUIDE_CATEGORIES } from "./sleepGuides";

test("offline sleep guides have unique IDs, age labels, summaries, and HTTPS sources", () => {
  assert.ok(SLEEP_GUIDES.length > 0);
  assert.equal(new Set(SLEEP_GUIDES.map((guide) => guide.id)).size, SLEEP_GUIDES.length);
  for (const guide of SLEEP_GUIDES) {
    assert.ok(guide.title.trim().length > 0);
    assert.ok(guide.age.trim().length > 0);
    assert.ok(guide.summary.trim().length >= 40);
    assert.ok(SLEEP_GUIDE_CATEGORIES.some((category) => category.id === guide.category));
    assert.ok(guide.source.trim().length > 0);
    assert.match(guide.url, /^https:\/\//);
  }
});

test("sleep education includes infant age changes and caregiver support", () => {
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "four-month-pattern"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "caregiver-rest"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "nap-transitions"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "night-feeds-and-sleep-plans"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "when-to-pause-sleep-plan"));
});
