import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { CareEvent, CareTask, SleepForecast } from "../domain/types";
import { isInQuietHours } from "../domain/time";

const SLEEP_NOTIFICATION_KIND = "uykuva-sleep-window";
const LEGACY_NOTIFICATION_KIND = "uykvua-sleep-window";
const CARE_TASK_NOTIFICATION_KIND = "uykuva-care-task";
const DIAPER_NOTIFICATION_KIND = "uykuva-diaper-check";
const MEDICATION_NOTIFICATION_KIND = "uykuva-medication-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("sleep-reminders", {
    name: "Uyku hatırlatmaları",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#A8C7B5"
  });
}

async function ensureCareTaskChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("care-task-reminders", {
    name: "Aşı ve randevu hatırlatmaları",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#A8C7B5"
  });
}

async function ensureDiaperChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("diaper-reminders", {
    name: "Bez kontrol hatırlatmaları",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#A8C7B5"
  });
}

async function ensureMedicationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("medication-reminders", {
    name: "İlaç planı hatırlatmaları",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#A8C7B5"
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelSleepReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => [SLEEP_NOTIFICATION_KIND, LEGACY_NOTIFICATION_KIND].includes(String(item.content.data?.kind)))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export async function cancelAllCareReminders() {
  await Promise.all([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync()
  ]);
}

export async function scheduleSleepReminder(
  babyName: string,
  forecast: SleepForecast,
  leadMinutes: number,
  quietStart: string,
  quietEnd: string
): Promise<boolean> {
  await cancelSleepReminders();
  if (!forecast.available || !forecast.start) return false;
  const date = new Date(forecast.start.getTime() - leadMinutes * 60_000);
  if (date.getTime() <= Date.now()) return false;
  if (isInQuietHours(date, quietStart, quietEnd)) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${babyName} için uyku vakti yaklaşıyor`,
      body: `Tahmini uyku penceresi yaklaşık ${leadMinutes} dakika sonra başlıyor. Bebeğinizin sinyallerini izleyin.`,
      data: { kind: SLEEP_NOTIFICATION_KIND }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === "android" ? "sleep-reminders" : undefined
    }
  });
  return true;
}

export async function scheduleCareTaskReminders(
  tasks: CareTask[],
  enabled: boolean,
  leadMinutes: number,
  quietStart: string,
  quietEnd: string
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => String(item.content.data?.kind) === CARE_TASK_NOTIFICATION_KIND)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (!enabled) return 0;
  await ensureCareTaskChannel();
  const now = Date.now();
  const upcoming = tasks.filter((task) => !task.completedAt && new Date(task.dueAt).getTime() > now);
  let count = 0;
  for (const task of upcoming) {
    const dueAt = new Date(task.dueAt);
    const reminderAt = new Date(dueAt.getTime() - leadMinutes * 60_000);
    if (reminderAt.getTime() <= now) continue;
    if (isInQuietHours(reminderAt, quietStart, quietEnd)) {
      const [hour, minute] = quietEnd.split(":").map(Number);
      reminderAt.setHours(hour ?? 0, minute ?? 0, 0, 0);
      if (reminderAt.getTime() <= now) reminderAt.setDate(reminderAt.getDate() + 1);
    }
    if (reminderAt.getTime() >= dueAt.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: task.type === "vaccine" ? "Aşı hatırlatması" : "Randevu hatırlatması",
        body: `${task.title} · ${dueAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}`,
        data: { kind: CARE_TASK_NOTIFICATION_KIND, taskId: task.id }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
        channelId: Platform.OS === "android" ? "care-task-reminders" : undefined
      }
    });
    count += 1;
  }
  return count;
}

export async function scheduleDiaperReminder(
  events: CareEvent[],
  enabled: boolean,
  afterHours: 2 | 3 | 4,
  quietStart: string,
  quietEnd: string,
  now = new Date()
): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => String(item.content.data?.kind) === DIAPER_NOTIFICATION_KIND)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (!enabled) return false;

  const lastDiaper = events
    .filter((event) => event.kind === "diaper" && new Date(event.startedAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  if (!lastDiaper) return false;

  const reminderAt = new Date(new Date(lastDiaper.startedAt).getTime() + afterHours * 60 * 60_000);
  if (reminderAt.getTime() <= now.getTime()) return false;
  if (isInQuietHours(reminderAt, quietStart, quietEnd)) {
    const originalReminderAt = reminderAt.getTime();
    const [hour, minute] = quietEnd.split(":").map(Number);
    reminderAt.setHours(hour ?? 0, minute ?? 0, 0, 0);
    if (reminderAt.getTime() <= originalReminderAt) reminderAt.setDate(reminderAt.getDate() + 1);
  }

  await ensureDiaperChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Bez kontrolü",
      body: `${afterHours} saat geçti. İsterseniz bebeğinizin bezini kontrol edin.`,
      data: { kind: DIAPER_NOTIFICATION_KIND, eventId: lastDiaper.id }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderAt,
      channelId: Platform.OS === "android" ? "diaper-reminders" : undefined
    }
  });
  return true;
}

export async function scheduleMedicationReminders(events: CareEvent[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => String(item.content.data?.kind) === MEDICATION_NOTIFICATION_KIND)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  const latestByMedicine = new Map<string, CareEvent>();
  for (const event of events) {
    const name = event.kind === "health" && event.healthType === "medicine" ? event.medicineName?.trim() : undefined;
    if (!name) continue;
    const key = name.toLocaleLowerCase("tr-TR");
    const existing = latestByMedicine.get(key);
    if (!existing || new Date(event.startedAt).getTime() > new Date(existing.startedAt).getTime()) latestByMedicine.set(key, event);
  }

  await ensureMedicationChannel();
  let count = 0;
  for (const event of latestByMedicine.values()) {
    if (!event.medicationReminderAt) continue;
    const reminderAt = new Date(event.medicationReminderAt);
    if (!Number.isFinite(reminderAt.getTime()) || reminderAt.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "İlaç planı hatırlatması",
        body: `${event.medicineName} için kaydettiğiniz saat geldi. Sağlık uzmanınızın veya ilaç etiketindeki talimatı kontrol edin.`,
        data: { kind: MEDICATION_NOTIFICATION_KIND, eventId: event.id }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
        channelId: Platform.OS === "android" ? "medication-reminders" : undefined
      }
    });
    count += 1;
  }
  return count;
}

