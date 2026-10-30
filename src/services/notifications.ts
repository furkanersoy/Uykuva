import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { CareEvent, CareTask, MilkExpiryReminderLead, SleepForecast } from "../domain/types";
import { dailyReminderDatesBefore, isInQuietHours, isValidClock } from "../domain/time";
import { createWakeReminderCoordinator } from "../domain/wakeReminders";
import { createMilkInventory, milkExpiryReminderLeadMs, milkStorageLabel } from "../domain/milk";
import { NOTIFICATION_KINDS, OPEN_SLEEP_WAKE_NOW_ACTION } from "../domain/notificationRouting";

const LEGACY_NOTIFICATION_KIND = "uykvua-sleep-window";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: notification.request.content.data?.kind !== NOTIFICATION_KINDS.openSleepCheck,
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

async function ensureMilkChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("milk-expiry-reminders", {
    name: "Sağılan süt hatırlatmaları",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#A8C7B5"
  });
}

async function ensureRoutineChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("routine-reminders", {
    name: "Akşam rutini hatırlatmaları",
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
      .filter((item) => [NOTIFICATION_KINDS.sleepWindow, LEGACY_NOTIFICATION_KIND].includes(String(item.content.data?.kind)))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export const replaceWakeReminders = createWakeReminderCoordinator({
  list: async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.filter((item) => item.content.data?.kind === NOTIFICATION_KINDS.sleepWake).map((item) => item.identifier);
  },
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  schedule: async (estimate, date, leadMinutes) => {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${estimate.babyName} için olası uyanış yaklaşıyor`,
        body: `Önceki benzer uyku kayıtlarına göre yaklaşık ${leadMinutes} dakika içinde uyanabilir; bu yalnızca bir tahmindir.`,
        data: { kind: NOTIFICATION_KINDS.sleepWake, childId: estimate.childId }
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === "android" ? "sleep-reminders" : undefined }
    });
  }
});

export async function cancelAllCareReminders() {
  await Promise.all([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync()
  ]);
}

export type OpenSleepCheckReminder = {
  childId: string;
  babyName: string;
  eventId: string;
  startedAt: string;
};

const OPEN_SLEEP_CHECK_CATEGORY = "uykuva_open_sleep_check";

async function ensureOpenSleepCheckCategory() {
  await Notifications.setNotificationCategoryAsync(OPEN_SLEEP_CHECK_CATEGORY, [{
    identifier: OPEN_SLEEP_WAKE_NOW_ACTION,
    buttonTitle: "Uyandı · şimdi kaydet",
    options: { opensAppToForeground: true }
  }]);
}

export async function replaceOpenSleepCheckReminders(
  reminders: OpenSleepCheckReminder[],
  quietStart: string,
  quietEnd: string,
  now = new Date()
): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.content.data?.kind === NOTIFICATION_KINDS.openSleepCheck)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  for (const reminder of reminders) {
    const startedAt = new Date(reminder.startedAt).getTime();
    if (!reminder.childId || !reminder.eventId || !Number.isFinite(startedAt)) continue;
    const target = new Date(startedAt + 12 * 60 * 60_000);
    if (target.getTime() <= now.getTime()) continue;
    let date = target;
    if (isInQuietHours(date, quietStart, quietEnd)) {
      const match = /^(\d{2}):(\d{2})$/.exec(quietEnd);
      if (match && Number(match[1]) <= 23 && Number(match[2]) <= 59) {
        date = new Date(target);
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
        if (date.getTime() <= target.getTime()) date.setDate(date.getDate() + 1);
      }
    }
    if (date.getTime() <= now.getTime()) continue;
    await ensureAndroidChannel();
    await ensureOpenSleepCheckCategory();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.babyName + " için uyku kaydı hâlâ açık mı?",
        body: "Uyandıysa saati düzenlemek için bildirime dokunun veya “Uyandı · şimdi kaydet” seçeneğini kullanın; hâlâ uyuyorsa bildirimi yok sayabilirsiniz.",
        sound: false,
        categoryIdentifier: OPEN_SLEEP_CHECK_CATEGORY,
        data: { kind: NOTIFICATION_KINDS.openSleepCheck, childId: reminder.childId, eventId: reminder.eventId }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === "android" ? "sleep-reminders" : undefined
      }
    });
  }
}

export async function scheduleSleepReminder(
  babyName: string,
  forecast: SleepForecast,
  leadMinutes: number,
  quietStart: string,
  quietEnd: string,
  cancelExisting = true,
  childId?: string
): Promise<boolean> {
  if (cancelExisting) await cancelSleepReminders();
  if (!forecast.available || !forecast.start) return false;
  const date = new Date(forecast.start.getTime() - leadMinutes * 60_000);
  if (date.getTime() <= Date.now()) return false;
  if (isInQuietHours(date, quietStart, quietEnd)) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${babyName} için uyku vakti yaklaşıyor`,
      body: `Tahmini uyku penceresi yaklaşık ${leadMinutes} dakika sonra başlıyor. Bebeğinizin sinyallerini izleyin.`,
      data: { kind: NOTIFICATION_KINDS.sleepWindow, ...(childId ? { childId } : {}) }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === "android" ? "sleep-reminders" : undefined
    }
  });
  return true;
}

export async function scheduleRoutineReminders(
  babyName: string,
  bedtime: string,
  routineMinutes: number,
  enabled: boolean,
  quietStart: string,
  quietEnd: string,
  now = new Date(),
  cancelExisting = true,
  childId?: string
): Promise<number> {
  if (cancelExisting) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter((item) => String(item.content.data?.kind) === NOTIFICATION_KINDS.routine)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  }
  if (!enabled || !isValidClock(bedtime) || !Number.isInteger(routineMinutes) || routineMinutes <= 0 || routineMinutes >= 1440) return 0;

  const reminders = dailyReminderDatesBefore(bedtime, routineMinutes, 7, now)
    .filter((date) => !isInQuietHours(date, quietStart, quietEnd));
  if (!reminders.length) return 0;
  await ensureRoutineChannel();
  for (const date of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${babyName} için akşam rutini`,
        body: `Hedef yatış saatinizden önce yaklaşık ${routineMinutes} dakikalık rutininize başlamak isteyebilirsiniz. Bu yalnızca sizin belirlediğiniz saat için hatırlatmadır.`,
        data: { kind: NOTIFICATION_KINDS.routine, ...(childId ? { childId } : {}) }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === "android" ? "routine-reminders" : undefined
      }
    });
  }
  return reminders.length;
}

export async function scheduleCareTaskReminders(
  tasks: CareTask[],
  enabled: boolean,
  leadMinutes: number,
  quietStart: string,
  quietEnd: string,
  babyName?: string,
  cancelExisting = true,
  childId?: string,
  caregiverNames: Record<string, string> = {}
) {
  if (cancelExisting) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter((item) => String(item.content.data?.kind) === NOTIFICATION_KINDS.careTask)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  }
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
        body: `${babyName ? `${babyName} · ` : ""}${task.title} · ${dueAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}${caregiverNames[task.assignedCaregiverId ?? ""] ? ` · Sorumlu: ${caregiverNames[task.assignedCaregiverId!]}` : ""}`,
        data: { kind: NOTIFICATION_KINDS.careTask, taskId: task.id, ...(childId ? { childId } : {}) }
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
  now = new Date(),
  babyName?: string,
  cancelExisting = true,
  childId?: string
): Promise<boolean> {
  if (cancelExisting) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter((item) => String(item.content.data?.kind) === NOTIFICATION_KINDS.diaper)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  }
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
      body: `${babyName ? `${babyName} · ` : ""}${afterHours} saat geçti. İsterseniz bezini kontrol edin.`,
      data: { kind: NOTIFICATION_KINDS.diaper, eventId: lastDiaper.id, ...(childId ? { childId } : {}) }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderAt,
      channelId: Platform.OS === "android" ? "diaper-reminders" : undefined
    }
  });
  return true;
}

export async function scheduleMedicationReminders(events: CareEvent[], babyName?: string, cancelExisting = true, childId?: string) {
  if (cancelExisting) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter((item) => String(item.content.data?.kind) === NOTIFICATION_KINDS.medication)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  }

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
        body: `${babyName ? `${babyName} · ` : ""}${event.medicineName} için kaydettiğiniz saat geldi. Sağlık uzmanınızın veya ilaç etiketindeki talimatı kontrol edin.`,
        data: { kind: NOTIFICATION_KINDS.medication, eventId: event.id, ...(childId ? { childId } : {}) }
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

export async function scheduleMilkExpiryReminders(
  events: CareEvent[],
  enabled: boolean,
  quietStart: string,
  quietEnd: string,
  now = new Date(),
  babyName?: string,
  cancelExisting = true,
  childId?: string,
  leadPreference: MilkExpiryReminderLead = "adaptive"
) {
  if (cancelExisting) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter((item) => String(item.content.data?.kind) === NOTIFICATION_KINDS.milkExpiry)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  }
  if (!enabled) return 0;

  const batches = createMilkInventory(events, now).batches
    .filter((batch) => batch.remainingMl > 0 && !batch.isExpired && batch.useBy.getTime() > now.getTime())
    .sort((a, b) => a.useBy.getTime() - b.useBy.getTime())
    .slice(0, 12);
  await ensureMilkChannel();
  let count = 0;
  for (const batch of batches) {
    const remainingMs = batch.useBy.getTime() - now.getTime();
    const useByLeadMs = milkExpiryReminderLeadMs(remainingMs, leadPreference);
    const milestones = [
      {
        type: "use-by",
        at: batch.useBy,
        leadMs: useByLeadMs,
        title: "Sağılan süt kullanım süresi yaklaşıyor",
        body: `${batch.remainingMl} ml ${milkStorageLabel(batch.event)} · ${batch.event.milkStorageLocation === "freezer" && !batch.isThawed ? "tavsiye edilen son tarih" : "kullanım süresi sonu"} ${batch.useBy.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}.`
      },
      ...(batch.event.milkStorageLocation === "freezer" && !batch.isThawed && batch.bestBy.getTime() > now.getTime() && batch.bestBy.getTime() < batch.useBy.getTime()
        ? [{
            type: "best-quality",
            at: batch.bestBy,
            leadMs: Math.min(7 * 24 * 60 * 60_000, Math.floor((batch.bestBy.getTime() - now.getTime()) / 2)),
            title: "Dondurulmuş süt için kalite tarihi yaklaşıyor",
            body: `${batch.remainingMl} ml ${milkStorageLabel(batch.event)} · en iyi kalite önerisi ${batch.bestBy.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}. Tavsiye edilen son tarih ${batch.useBy.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}.`
          }]
        : [])
    ];
    for (const milestone of milestones) {
      const reminderAt = new Date(milestone.at.getTime() - milestone.leadMs);
      if (reminderAt.getTime() <= now.getTime()) continue;
      if (isInQuietHours(reminderAt, quietStart, quietEnd)) {
        const [hour, minute] = quietEnd.split(":").map(Number);
        reminderAt.setHours(hour ?? 0, minute ?? 0, 0, 0);
        if (reminderAt.getTime() <= now.getTime()) reminderAt.setDate(reminderAt.getDate() + 1);
      }
      if (reminderAt.getTime() >= milestone.at.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: babyName ? `${babyName} · ${milestone.title}` : milestone.title,
          body: milestone.body,
          data: { kind: NOTIFICATION_KINDS.milkExpiry, eventId: batch.event.id, ...(childId ? { childId } : {}), milestone: milestone.type }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderAt,
          channelId: Platform.OS === "android" ? "milk-expiry-reminders" : undefined
        }
      });
      count += 1;
    }
  }
  return count;
}
