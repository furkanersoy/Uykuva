import assert from "node:assert/strict";
import test from "node:test";
import { notificationDestination, NOTIFICATION_KINDS } from "./notificationRouting";

test("sleep, routine, and diaper reminders open Today for the matching child", () => {
  for (const kind of [NOTIFICATION_KINDS.sleepWindow, NOTIFICATION_KINDS.sleepWake, NOTIFICATION_KINDS.routine, NOTIFICATION_KINDS.diaper]) {
    assert.deepEqual(notificationDestination({ kind, childId: "baby-2" }), { tab: "today", childId: "baby-2" });
  }
});

test("care-task reminders open their task in Insights", () => {
  assert.deepEqual(notificationDestination({ kind: NOTIFICATION_KINDS.careTask, childId: "baby-2", taskId: "visit-1" }), {
    tab: "insights", childId: "baby-2", taskId: "visit-1"
  });
});

test("medicine and milk reminders open their recorded event in the timeline", () => {
  for (const kind of [NOTIFICATION_KINDS.medication, NOTIFICATION_KINDS.milkExpiry]) {
    assert.deepEqual(notificationDestination({ kind, childId: "baby-2", eventId: "event-1" }), {
      tab: "timeline", childId: "baby-2", eventId: "event-1"
    });
  }
});

test("unknown or malformed notification data is ignored", () => {
  assert.equal(notificationDestination(null), null);
  assert.equal(notificationDestination([]), null);
  assert.equal(notificationDestination({ kind: "other" }), null);
});
