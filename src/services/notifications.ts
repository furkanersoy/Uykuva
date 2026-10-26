import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { SleepForecast } from "../domain/types";
import { isInQuietHours } from "../domain/time";

const SLEEP_NOTIFICATION_KIND = "uykuva-sleep-window";
const LEGACY_NOTIFICATION_KIND = "uykvua-sleep-window";

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
