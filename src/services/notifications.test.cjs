const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");

test("Expo adapter schedules wake reminders and cancels only its own notifications", async () => {
  const scheduled = new Map([
    ["old-wake", { content: { data: { kind: "uykuva-sleep-wake" } } }],
    ["sleep-window", { content: { data: { kind: "uykuva-sleep-window" } } }],
    ["other", { content: { data: { kind: "uykuva-care-task" } } }]
  ]);
  const channels = [];
  const mockNotifications = {
    setNotificationHandler() {},
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: "date" },
    setNotificationChannelAsync: async (id) => { channels.push(id); },
    getAllScheduledNotificationsAsync: async () => [...scheduled].map(([identifier, value]) => ({ identifier, ...value })),
    cancelScheduledNotificationAsync: async (id) => { scheduled.delete(id); },
    scheduleNotificationAsync: async (request) => { scheduled.set("new-wake", request); return "new-wake"; }
  };
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "react-native") return { Platform: { OS: "android" } };
    if (request === "expo-notifications") return mockNotifications;
    return originalLoad.call(this, request, parent, isMain);
  };
  let service;
  try {
    service = require("../../.test-build/services/notifications.js");
  } finally {
    Module._load = originalLoad;
  }

  const typical = new Date(Date.now() + 60 * 60_000);
  await service.replaceWakeReminders([{ childId: "baby-2", babyName: "Deneme", typical }], 10, "00:00", "00:00");
  assert.equal(scheduled.has("old-wake"), false);
  assert.equal(scheduled.has("sleep-window"), true);
  assert.equal(scheduled.has("other"), true);
  const request = scheduled.get("new-wake");
  assert.equal(request.content.data.kind, "uykuva-sleep-wake");
  assert.equal(request.content.data.childId, "baby-2");
  assert.equal(request.trigger.type, "date");
  assert.equal(request.trigger.channelId, "sleep-reminders");
  assert.equal(request.trigger.date.getTime(), typical.getTime() - 10 * 60_000);
  assert.deepEqual(channels, ["sleep-reminders"]);

  await service.replaceWakeReminders([], 10, "00:00", "00:00");
  assert.equal(scheduled.has("new-wake"), false);
  assert.equal(scheduled.has("sleep-window"), true);
  assert.equal(scheduled.has("other"), true);
});
