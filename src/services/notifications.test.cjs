const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const path = require("node:path");

test("Expo adapter schedules wake reminders and cancels only its own notifications", async () => {
  const scheduled = new Map([
    ["old-wake", { content: { data: { kind: "uykuva-sleep-wake" } } }],
    ["sleep-window", { content: { data: { kind: "uykuva-sleep-window" } } }],
    ["other", { content: { data: { kind: "uykuva-care-task" } } }]
  ]);
  const channels = [];
  const categories = [];
  const mockNotifications = {
    setNotificationHandler() {},
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: "date" },
    setNotificationChannelAsync: async (id) => { channels.push(id); },
    setNotificationCategoryAsync: async (identifier, actions) => { categories.push({ identifier, actions }); },
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
    const buildDirectory = process.env.UYKUVA_TEST_BUILD || path.resolve(__dirname, "../../.test-build");
    service = require(path.join(buildDirectory, "services", "notifications.js"));
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

  scheduled.set("old-open-sleep", { content: { data: { kind: "uykuva-open-sleep-check" } } });
  const checkNow = new Date(2026, 9, 30, 0, 0, 0);
  await service.replaceOpenSleepCheckReminders([{
    childId: "baby-2",
    babyName: "Deneme",
    eventId: "sleep-1",
    startedAt: new Date(checkNow.getTime() - 7 * 60 * 60_000).toISOString()
  }], "22:00", "07:00", checkNow);
  assert.equal(scheduled.has("old-open-sleep"), false);
  const openSleepCheck = scheduled.get("new-wake");
  assert.equal(openSleepCheck.content.data.kind, "uykuva-open-sleep-check");
  assert.equal(openSleepCheck.content.data.childId, "baby-2");
  assert.equal(openSleepCheck.content.data.eventId, "sleep-1");
  assert.equal(openSleepCheck.content.categoryIdentifier, "uykuva_open_sleep_check");
  assert.deepEqual(categories, [{
    identifier: "uykuva_open_sleep_check",
    actions: [{
      identifier: "uykuva_open_sleep_wake_now",
      buttonTitle: "Uyandı · şimdi kaydet",
      options: { opensAppToForeground: true }
    }]
  }]);
  assert.equal(openSleepCheck.trigger.date.getTime(), new Date(2026, 9, 30, 7, 0, 0).getTime());

  await service.replaceOpenSleepCheckReminders([], "22:00", "07:00", checkNow);
  assert.equal(scheduled.has("new-wake"), false);
  assert.equal(scheduled.has("sleep-window"), true);
  assert.equal(scheduled.has("other"), true);

  const taskDueAt = new Date(Date.now() + 60 * 60_000);
  await service.scheduleCareTaskReminders([{
    id: "appointment-1",
    type: "appointment",
    title: "Kontrol",
    dueAt: taskDueAt.toISOString(),
    assignedCaregiverId: "caregiver-2"
  }], true, 15, "00:00", "00:00", "Deniz", true, "baby-2", { "caregiver-2": "Baba" });
  const taskReminder = scheduled.get("new-wake");
  assert.match(taskReminder.content.body, /Sorumlu: Baba/);
  assert.equal(taskReminder.content.data.taskId, "appointment-1");
});
