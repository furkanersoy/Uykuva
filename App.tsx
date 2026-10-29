import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  AppState,
  Alert,
  Linking,
  Modal,
  NativeModules,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { useUykuvaState } from "./src/state/useUykuvaState";
import { coachingDay, compareNapPatterns, compareSleepPlanCheckIns, correctedAgeDays, correctedAgeMonths, createAwakeWindowInsights, createDailyNapOutline, createSleepCoachGuidance, createSleepCoachInsights, createSleepForecast, estimateSleepWakeWindow, handoffSummary, hasSleepSinceWake, isSleepPlanPausedToday, methodDescription, NIGHT_WAKE_RESPONSE_OPTIONS, nightWakeResponseLabel, sleepDayContextLabel, SLEEP_READINESS_ITEMS, SLEEP_SUPPORT_OPTIONS, sleepProgramStage, sleepSupportLabel, summarizeNightSleep, wakeWindowGuide, weeklySleepTotals } from "./src/domain/sleep";
import { createDoctorSummary, createDoctorSummaryHtml } from "./src/domain/reports";
import { createDataExport, mergeDataStates, parseDataExport } from "./src/domain/export";
import { createEncryptedDataExport, decryptDataExport, isEncryptedDataExport } from "./src/domain/encryptedExport";
import { completedAgeMonths, suggestedVaccineTasks, TURKEY_VACCINE_SCHEDULE_BASE_VERSION, TURKEY_VACCINE_SCHEDULE_UPDATE_DATE, TURKEY_VACCINE_SCHEDULE_UPDATE_SOURCE } from "./src/domain/vaccineSchedule";
import { clockInputDigits, isTodayTimeReached, isValidClock, normalizeClockInput } from "./src/domain/time";
import { breastfeedingSideMinutes, completedFeedMinutes, createFeedingForecast, feedingElapsedMinutes, nextBreastSide, todayFeedingTotals, TRACKED_ALLERGENS } from "./src/domain/feeding";
import { createMilkInventory, milkStorageLabel } from "./src/domain/milk";
import { notificationDestination } from "./src/domain/notificationRouting";
import { GrowthIndicator, GrowthScore, growthAgeLabel, whoGrowthScore } from "./src/domain/whoGrowth";
import { detectRecordedMilestones } from "./src/domain/milestones";
import { DEVELOPMENT_CHECKPOINTS, developmentCheckpointForAge } from "./src/data/developmentMilestones";
import { weeklyDiaperTotals } from "./src/domain/diapers";
import { summarizeSolidFoodHistory } from "./src/domain/solids";
import { AppState as UykuvaAppState, CareEvent, CareTask, Caregiver, NightWakeResponse, RoutineStep, SleepDayContext, SleepFocus, SleepMethod, SleepSupport } from "./src/domain/types";
import { cancelSleepReminders, requestNotificationPermission, scheduleCareTaskReminders, scheduleDiaperReminder, scheduleMedicationReminders, scheduleMilkExpiryReminders, scheduleRoutineReminders, scheduleSleepReminder } from "./src/services/notifications";
import { Card, Pill, PrimaryButton, SectionTitle } from "./src/ui/components";
import { colors } from "./src/ui/theme";

type Tab = "today" | "timeline" | "coach" | "insights" | "family";
type LogMode = "feed" | "diaper" | "note" | "health" | "growth" | "memory" | null;
type TaskMode = "vaccine" | "appointment" | null;
type TimelineFilter = "all" | "sleep" | "feeding" | "pumping" | "diaper" | "health" | "growth" | "notes" | "memories";

const timelineFilters: { id: TimelineFilter; label: string }[] = [
  { id: "all", label: "Tümü" }, { id: "sleep", label: "Uyku" }, { id: "feeding", label: "Beslenme" },
  { id: "pumping", label: "Sağım" }, { id: "diaper", label: "Bez" }, { id: "health", label: "Sağlık" },
  { id: "growth", label: "Ölçüm" }, { id: "notes", label: "Not" }, { id: "memories", label: "Anı" }
];

const tabs: { id: Tab; label: string; glyph: string }[] = [
  { id: "today", label: "Bugün", glyph: "⌂" },
  { id: "timeline", label: "Akış", glyph: "≋" },
  { id: "coach", label: "Uyku", glyph: "☾" },
  { id: "insights", label: "Özet", glyph: "⌁" },
  { id: "family", label: "Aile", glyph: "♧" }
];

const memoryPrompts = ["İlk gülüş", "İlk yuvarlanma", "İlk katı gıda", "İlk diş", "İlk kelime", "İlk adım"];
const sleepFocusOptions: { id: SleepFocus; label: string }[] = [
  { id: "bedtime", label: "Yatma zamanı" },
  { id: "nightWakings", label: "Gece uyanmaları" },
  { id: "naps", label: "Gündüz uykuları" },
  { id: "routine", label: "Akşam rutini" }
];
const sleepDayContextOptions: { id?: SleepDayContext; label: string }[] = [
  { label: "Olağan gün" },
  { id: "illness", label: "Hastalık / rahatsızlık" },
  { id: "travel", label: "Seyahat" },
  { id: "teething", label: "Diş çıkarma" },
  { id: "routineChange", label: "Düzen değişikliği" }
];

function time(value?: string | Date) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function duration(event: CareEvent) {
  if (!event.endedAt) return "devam ediyor";
  const minutes = Math.round((new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime()) / 60_000);
  return `${minutes} dk`;
}

function compactMinutes(minutes: number) {
  const value = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  if (hours === 0) return `${remainder} dk`;
  return remainder === 0 ? `${hours} sa` : `${hours} sa ${remainder} dk`;
}

function eventTitle(event: CareEvent) {
  if (event.kind === "sleep") return `Uyku · ${duration(event)}${event.sleepSupport ? ` · ${sleepSupportLabel(event.sleepSupport)}` : ""}`;
  if (event.kind === "feed") {
    if (event.feedType === "pump") return `Sağım · ${event.amountMl ?? 0} ml`;
    if (event.feedType === "bottle") return `Biberon · ${event.amountMl ?? 0} ml${event.bottleSource === "expressed" ? " · sağılan süt" : ""}`;
    if (event.feedType === "solid") return `Katı gıda · ${event.foods?.join(", ") || "öğün"}`;
    const side = { left: "sol", right: "sağ", both: "iki taraf" }[event.breastSide ?? "both"];
    const minutes = completedFeedMinutes(event);
    if (event.breastSessions?.length) {
      const sides = breastfeedingSideMinutes(event);
      const details = [sides.left ? `sol ${sides.left} dk` : "", sides.right ? `sağ ${sides.right} dk` : ""].filter(Boolean).join(" + ");
      return `Emzirme · ${details || side}${event.endedAt ? ` · ${minutes} dk` : " · sürüyor"}`;
    }
    return `Emzirme · ${side}${minutes ? ` · ${minutes} dk` : " · sürüyor"}`;
  }
  if (event.kind === "diaper") return `Bez · ${{ wet: "ıslak", dirty: "kirli", both: "ıslak + kirli" }[event.diaperType ?? "wet"]}`;
  if (event.kind === "health") {
    if (event.healthType === "temperature") return `Ateş · ${event.temperatureC ?? "—"} °C`;
    if (event.healthType === "medicine") return `${event.medicineName || "İlaç"}${event.doseAsEntered ? ` · ${event.doseAsEntered}` : ""}`;
    return `Belirti · ${event.note || "not"}`;
  }
  if (event.kind === "growth") return `Ölçüm · ${event.weightG ? `${event.weightG} g` : ""}${event.lengthCm ? ` · ${event.lengthCm} cm` : ""}`;
  if (event.kind === "memory") return `Anı · ${event.memoryTitle || event.note || "Kayıt"}`;
  return event.note || "Not";
}

export default function App() {
  const app = useUykuvaState();
  const [clockNow, setClockNow] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>("today");
  const [logMode, setLogMode] = useState<LogMode>(null);
  const [taskMode, setTaskMode] = useState<TaskMode>(null);
  const [taskToEdit, setTaskToEdit] = useState<CareTask | null>(null);
  const [vaccineSuggestionsOpen, setVaccineSuggestionsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [caregiverOpen, setCaregiverOpen] = useState(false);
  const [nightWakeOpen, setNightWakeOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [sleepEditor, setSleepEditor] = useState<CareEvent | "new" | null>(null);
  const [sleepEditorSuggestedStart, setSleepEditorSuggestedStart] = useState<string | null>(null);
  const [sleepEditorSuggestedWindow, setSleepEditorSuggestedWindow] = useState<{ start: string; end: string } | null>(null);
  const [eventEditor, setEventEditor] = useState<CareEvent | null>(null);
  const [promptedSleepWindow, setPromptedSleepWindow] = useState<number | null>(null);
  const [promptedRunningSleepId, setPromptedRunningSleepId] = useState<string | null>(null);
  const [foregroundCycle, setForegroundCycle] = useState(0);
  const lastNotificationResponseId = useRef<string | null>(null);
  useEffect(() => {
    let awayFromApp = AppState.currentState !== "active";
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && awayFromApp) setForegroundCycle((cycle) => cycle + 1);
      awayFromApp = nextState !== "active";
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const todaySleepCheckIn = app.state.sleepPlan.checkIns.find((item) => item.date === localDateValue(clockNow));
  const savedMorningWake = todaySleepCheckIn?.wakeTime;
  const savedMorningWakeAt = useMemo(() => {
    if (!savedMorningWake || !isValidClock(savedMorningWake)) return undefined;
    const [hour, minute] = savedMorningWake.split(":").map(Number);
    const wakeAt = new Date(clockNow);
    wakeAt.setHours(hour!, minute!, 0, 0);
    return wakeAt;
  }, [clockNow, savedMorningWake]);
  const hasSleepSinceMorningWake = savedMorningWakeAt ? hasSleepSinceWake(app.state.events, savedMorningWakeAt) : false;
  const forecastWakeAt = hasSleepSinceMorningWake ? undefined : savedMorningWakeAt;
  const forecast = useMemo(() => createSleepForecast(app.state.baby, app.state.events, clockNow, forecastWakeAt, todaySleepCheckIn?.dayContext), [app.state.baby, app.state.events, clockNow, forecastWakeAt, todaySleepCheckIn?.dayContext]);
  const feedingForecast = useMemo(() => createFeedingForecast(app.state.events), [app.state.events]);
  const childSleepReminders = useMemo(() => app.state.children.map((child) => {
    const checkIn = child.sleepPlan.checkIns.find((item) => item.date === localDateValue(clockNow));
    const wakeMinutes = checkIn?.wakeTime && isValidClock(checkIn.wakeTime) ? checkIn.wakeTime.split(":").map(Number) : undefined;
    const wakeAt = wakeMinutes ? new Date(clockNow) : undefined;
    if (wakeAt && wakeMinutes) wakeAt.setHours(wakeMinutes[0]!, wakeMinutes[1]!, 0, 0);
    const forecastWake = wakeAt && !hasSleepSinceWake(child.events, wakeAt) ? wakeAt : undefined;
    return {
      childId: child.baby.id,
      babyName: child.baby.name,
      isSleeping: child.events.some((event) => event.kind === "sleep" && !event.endedAt),
      forecast: createSleepForecast(child.baby, child.events, clockNow, forecastWake, checkIn?.dayContext)
    };
  }), [app.state.children, clockNow]);
  const childSleepReminderKey = childSleepReminders.map((child) => `${child.childId}:${child.babyName}:${child.isSleeping}:${child.forecast.available}:${child.forecast.start?.getTime() ?? ""}:${child.forecast.end?.getTime() ?? ""}:${child.forecast.explanation}`).join("|");

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    let active = true;
    const openNotificationDestination = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const request = response.notification.request;
      if (lastNotificationResponseId.current === request.identifier) return;
      lastNotificationResponseId.current = request.identifier;
      const destination = notificationDestination(request.content.data);
      if (!destination) {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        return;
      }
      const child = destination.childId
        ? app.state.children.find((item) => item.baby.id === destination.childId)
        : app.state.children.find((item) => item.baby.id === app.state.activeChildId);
      if (destination.childId && !child) {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        return;
      }
      if (destination.childId && child) app.setActiveChild(child.baby.id);
      setNightMode(false);
      setTab(destination.tab);
      if (destination.taskId && child) {
        const task = child.careTasks.find((item) => item.id === destination.taskId);
        if (task) {
          setTaskToEdit(task);
          setTaskMode(task.type);
        }
      }
      if (destination.eventId && child) {
        const event = child.events.find((item) => item.id === destination.eventId);
        if (event) setEventEditor(event);
      }
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationDestination);
    void Notifications.getLastNotificationResponseAsync().then(openNotificationDestination).catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [app.hydrated, app.state.onboardingComplete, app.state.children, app.state.activeChildId, app.setActiveChild]);

  useEffect(() => {
    const widget = NativeModules.UykuvaWidget as { updateSleepWindow?: (babyName: string, sleepWindow: string, status: string) => Promise<void> } | undefined;
    if (!app.hydrated || !app.state.onboardingComplete || !widget?.updateSleepWindow) return;
    const sleepWindow = app.runningSleep
      ? "Uyku devam ediyor"
      : forecast.available && forecast.start && forecast.end
        ? `${time(forecast.start)}–${time(forecast.end)}`
        : "Uyku aralığı bekleniyor";
    const status = app.runningSleep
      ? `Başlangıç ${time(app.runningSleep.startedAt)}`
      : !forecast.available || !forecast.start || !forecast.end
        ? "Güncel tahmin için Uykuva'yı açın"
        : clockNow < forecast.start
          ? `Uykuya ${compactMinutes((forecast.start.getTime() - clockNow.getTime()) / 60_000)} kaldı`
          : clockNow < forecast.end
            ? "Uyku penceresi açık"
            : "Aralık geçti · uyku işaretlerini izleyin";
    void widget.updateSleepWindow(app.state.baby.name, sleepWindow, status).catch(() => undefined);
  }, [app.hydrated, app.state.onboardingComplete, app.state.baby.name, app.runningSleep, forecast, clockNow]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete || app.runningSleep || sleepEditor || logMode || taskMode || eventEditor || nightWakeOpen || restoreOpen || profileOpen || caregiverOpen || vaccineSuggestionsOpen || !forecast.available || !forecast.start || !forecast.end) return;
    const start = forecast.start.getTime();
    const end = forecast.end.getTime();
    if (clockNow.getTime() < end || clockNow.getTime() >= end + 10 * 60_000 || promptedSleepWindow === start) return;
    const alreadyLogged = app.state.events.some((event) => event.kind === "sleep" && new Date(event.startedAt).getTime() >= start - 15 * 60_000 && new Date(event.startedAt).getTime() <= end + 30 * 60_000);
    if (alreadyLogged) return;
    setPromptedSleepWindow(start);
    const suggestedStart = new Date((start + end) / 2).toISOString();
    Alert.alert(
      "Uyku aralığı geçti",
      `Bebeğiniz tahmini ${time(forecast.start)}–${time(forecast.end)} aralığında uykuya daldı mı? Evet derseniz orta saat forma eklenir; kaydetmeden önce düzeltebilirsiniz.`,
      [
        { text: "Henüz değil", style: "cancel" },
        { text: "Uyudu", onPress: () => { setSleepEditorSuggestedStart(suggestedStart); setSleepEditorSuggestedWindow({ start: new Date(start).toISOString(), end: new Date(end).toISOString() }); setSleepEditor("new"); } }
      ]
    );
  }, [app.hydrated, app.state.onboardingComplete, app.state.events, app.runningSleep, clockNow, forecast.available, forecast.start?.getTime(), forecast.end?.getTime(), sleepEditor, promptedSleepWindow, logMode, taskMode, eventEditor, nightWakeOpen, restoreOpen, profileOpen, caregiverOpen, vaccineSuggestionsOpen]);

  useEffect(() => {
    const running = app.runningSleep;
    if (!app.hydrated || !app.state.onboardingComplete || !running || promptedRunningSleepId === running.id || logMode || taskMode || sleepEditor || eventEditor || nightWakeOpen || restoreOpen || profileOpen || caregiverOpen || vaccineSuggestionsOpen) return;
    const startedAt = new Date(running.startedAt).getTime();
    if (!Number.isFinite(startedAt) || Date.now() - startedAt < 12 * 60 * 60_000) return;
    setPromptedRunningSleepId(running.id);
    Alert.alert(
      "Uyku sayacı hâlâ çalışıyor mu?",
      `Kayıt ${time(running.startedAt)} saatinde başladı. Uyku süresini tahmin etmiyoruz. Bebeğiniz hâlâ uyuyorsa sayacı açık bırakın; uyandıysa gerçek uyanış saatini düzeltebilirsiniz.`,
      [
        { text: "Hâlâ uyuyor", style: "cancel" },
        { text: "Uyanış saatini düzelt", onPress: () => { const current = app.state.events.find((item) => item.id === running.id); if (current) setSleepEditor(current); } }
      ]
    );
  }, [app.hydrated, app.state.onboardingComplete, app.state.events, app.runningSleep, promptedRunningSleepId, foregroundCycle, clockNow, logMode, taskMode, sleepEditor, eventEditor, nightWakeOpen, restoreOpen, profileOpen, caregiverOpen, vaccineSuggestionsOpen]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    if (!app.state.preferences.notificationsEnabled) {
      void cancelSleepReminders();
      return;
    }
    void (async () => {
      await cancelSleepReminders();
      for (const child of childSleepReminders) {
        if (child.isSleeping) continue;
        await scheduleSleepReminder(child.babyName, child.forecast, app.state.preferences.sleepReminderMinutes, app.state.preferences.quietStart, app.state.preferences.quietEnd, false, child.childId);
      }
    })();
  }, [app.hydrated, app.state.onboardingComplete, app.state.preferences.notificationsEnabled, app.state.preferences.sleepReminderMinutes, app.state.preferences.quietStart, app.state.preferences.quietEnd, childSleepReminderKey]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    void (async () => {
      for (let index = 0; index < app.state.children.length; index += 1) {
        const child = app.state.children[index]!;
        await scheduleCareTaskReminders(child.careTasks, app.state.preferences.careTaskRemindersEnabled, app.state.preferences.careTaskReminderMinutes, app.state.preferences.quietStart, app.state.preferences.quietEnd, child.baby.name, index === 0, child.baby.id);
      }
    })();
  }, [app.hydrated, app.state.onboardingComplete, app.state.children, app.state.preferences.careTaskRemindersEnabled, app.state.preferences.careTaskReminderMinutes, app.state.preferences.quietStart, app.state.preferences.quietEnd]);

  useEffect(() => {
    if (!app.hydrated) return;
    void (async () => {
      for (let index = 0; index < app.state.children.length; index += 1) {
        const child = app.state.children[index]!;
        const routineMinutes = child.sleepPlan.routine.reduce((sum, step) => sum + (step.enabled ? step.minutes : 0), 0);
        await scheduleRoutineReminders(child.baby.name, child.sleepPlan.bedtime, routineMinutes, app.state.onboardingComplete && app.state.preferences.routineRemindersEnabled, app.state.preferences.quietStart, app.state.preferences.quietEnd, new Date(), index === 0, child.baby.id);
      }
    })();
  }, [app.hydrated, app.state.onboardingComplete, app.state.children, app.state.preferences.routineRemindersEnabled, app.state.preferences.quietStart, app.state.preferences.quietEnd, localDateValue(clockNow)]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    void (async () => {
      for (let index = 0; index < app.state.children.length; index += 1) {
        const child = app.state.children[index]!;
        await scheduleDiaperReminder(child.events, app.state.preferences.diaperRemindersEnabled, app.state.preferences.diaperReminderHours, app.state.preferences.quietStart, app.state.preferences.quietEnd, new Date(), child.baby.name, index === 0, child.baby.id);
      }
    })();
  }, [app.hydrated, app.state.onboardingComplete, app.state.children, app.state.preferences.diaperRemindersEnabled, app.state.preferences.diaperReminderHours, app.state.preferences.quietStart, app.state.preferences.quietEnd]);

  useEffect(() => {
    if (!app.hydrated) return;
    void (async () => {
      for (let index = 0; index < app.state.children.length; index += 1) {
        const child = app.state.children[index]!;
        await scheduleMedicationReminders(app.state.onboardingComplete ? child.events : [], child.baby.name, index === 0, child.baby.id);
      }
    })();
  }, [app.hydrated, app.state.onboardingComplete, app.state.children]);

  useEffect(() => {
    if (!app.hydrated) return;
    void (async () => {
      for (let index = 0; index < app.state.children.length; index += 1) {
        const child = app.state.children[index]!;
        await scheduleMilkExpiryReminders(app.state.onboardingComplete ? child.events : [], app.state.onboardingComplete && app.state.preferences.milkExpiryRemindersEnabled, app.state.preferences.quietStart, app.state.preferences.quietEnd, new Date(), child.baby.name, index === 0, child.baby.id, app.state.preferences.milkExpiryReminderLead);
      }
    })();
  }, [app.hydrated, app.state.onboardingComplete, app.state.children, app.state.preferences.milkExpiryRemindersEnabled, app.state.preferences.milkExpiryReminderLead, app.state.preferences.quietStart, app.state.preferences.quietEnd]);

  const promptNightWake = () => setNightWakeOpen(true);
  const switchCaregiver = () => {
    const caregivers = app.state.caregivers;
    if (caregivers.length < 2) return;
    const currentIndex = caregivers.findIndex((caregiver) => caregiver.id === app.state.activeCaregiverId);
    app.setActiveCaregiver(caregivers[(currentIndex + 1 + caregivers.length) % caregivers.length]!.id);
  };
  const switchChild = () => {
    const children = app.state.children;
    if (children.length < 2) return;
    const currentIndex = children.findIndex((child) => child.baby.id === app.state.activeChildId);
    app.setActiveChild(children[(currentIndex + 1 + children.length) % children.length]!.baby.id);
  };
  const saveNightWake = (response: NightWakeResponse, occurredAt: string) => {
    const now = new Date();
    const date = localDateValue(now);
    const checkIn = app.state.sleepPlan.checkIns.find((item) => item.date === date);
    const log = { id: `wake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: occurredAt, response, caregiver: app.state.caregiverName };
    app.saveCheckIn({ ...checkIn, date, nightWakeLogs: [...(checkIn?.nightWakeLogs ?? []), log].slice(-30) });
    setNightWakeOpen(false);
  };

  if (!app.hydrated) return <LoadingScreen />;
  if (!app.storageReady) return <StorageRecoveryScreen message={app.storageError ?? "Kayıtlar yüklenemedi. Mevcut veriler korunuyor."} onRetry={app.retryStorage} />;
  if (!app.state.onboardingComplete) return <OnboardingScreen onComplete={app.completeOnboarding} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={nightMode ? "light-content" : "dark-content"} />
      <ExpoStatusBar style={nightMode ? "light" : "dark"} />
      <View style={styles.shell}>
        {!nightMode ? <View style={styles.header}>
          <View>
            <Text style={styles.brand}>uykuva</Text>
            <Text style={styles.headerSub}>{app.state.baby.name} · bugün</Text>
            {app.state.children.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Aktif çocuk ${app.state.baby.name}. Sonraki çocuğa geç`} onPress={switchChild} style={styles.headerCaregiver}><Text style={styles.headerCaregiverText}>Çocuk: {app.state.baby.name} · Değiştir</Text></Pressable> : null}
            {app.state.caregivers.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Aktif bakım veren ${app.state.caregiverName}. Sonraki bakım verene geç`} onPress={switchCaregiver} style={styles.headerCaregiver}><Text style={styles.headerCaregiverText}>Kayıtları ekleyen: {app.state.caregiverName} · Değiştir</Text></Pressable> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Profili düzenle" onPress={() => setProfileOpen(true)} style={styles.avatar}><Text style={styles.avatarText}>{app.state.baby.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text></Pressable>
        </View> : null}

        {tab === "today" && <TodayScreen key={app.state.activeChildId} app={app} forecast={forecast} feedingForecast={feedingForecast} openLog={setLogMode} now={clockNow} nightMode={nightMode} onToggleNightMode={() => setNightMode((value) => !value)} onLogNightWake={promptNightWake} onSwitchCaregiver={switchCaregiver} onSwitchChild={switchChild} />}
        {tab === "timeline" && <TimelineScreen events={app.state.events} caregivers={app.state.caregivers.map((caregiver) => caregiver.name)} onDelete={app.deleteEvent} onEditSleep={(event) => { setSleepEditorSuggestedStart(null); setSleepEditorSuggestedWindow(null); setSleepEditor(event); }} onEditRecord={setEventEditor} onAddSleep={() => { setSleepEditorSuggestedStart(null); setSleepEditorSuggestedWindow(null); setSleepEditor("new"); }} />}
        {tab === "coach" && <CoachScreen key={app.state.activeChildId} app={app} now={clockNow} />}
        {tab === "insights" && <InsightsScreen app={app} openTask={(mode) => { setTaskToEdit(null); setTaskMode(mode); }} openEditTask={(task) => { setTaskToEdit(task); setTaskMode(task.type); }} openVaccineSuggestions={() => setVaccineSuggestionsOpen(true)} now={clockNow} />}
        {tab === "family" && <FamilyScreen app={app} onEditProfile={() => setProfileOpen(true)} onAddCaregiver={() => setCaregiverOpen(true)} onAddChild={() => setChildOpen(true)} onRestoreData={() => setRestoreOpen(true)} />}

        {!nightMode ? <View style={styles.nav}>
          {tabs.map((item) => (
            <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)} style={styles.navItem}>
              <Text style={[styles.navGlyph, tab === item.id && styles.navActive]}>{item.glyph}</Text>
              <Text style={[styles.navLabel, tab === item.id && styles.navActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View> : null}
      </View>
      <QuickLogModal mode={logMode} close={() => setLogMode(null)} app={app} now={clockNow} />
      <CareTaskModal mode={taskMode} task={taskToEdit} close={() => { setTaskMode(null); setTaskToEdit(null); }} add={app.addCareTask} update={app.updateCareTask} />
      <VaccineSuggestionsModal visible={vaccineSuggestionsOpen} close={() => setVaccineSuggestionsOpen(false)} birthDate={app.state.baby.birthDate} tasks={app.state.careTasks} add={app.addCareTask} now={clockNow} />
      <ProfileModal visible={profileOpen} close={() => setProfileOpen(false)} app={app} />
      <ChildProfileModal visible={childOpen} close={() => setChildOpen(false)} add={app.addChild} />
      <CaregiverModal visible={caregiverOpen} close={() => setCaregiverOpen(false)} caregivers={app.state.caregivers.map((caregiver) => caregiver.name)} add={app.addCaregiver} />
      <DataRestoreModal visible={restoreOpen} close={() => setRestoreOpen(false)} currentState={app.state} restore={app.restoreData} />
      <SleepEntryModal event={sleepEditor === "new" ? null : sleepEditor} initialStartAt={sleepEditorSuggestedStart ?? undefined} initialSuggestedWindow={sleepEditorSuggestedWindow ?? undefined} visible={sleepEditor !== null} close={() => { setSleepEditor(null); setSleepEditorSuggestedStart(null); setSleepEditorSuggestedWindow(null); }} add={app.addEvent} update={app.updateEvent} bedtime={app.state.sleepPlan.bedtime} wakeTime={app.state.sleepPlan.wakeTime} />
      <RecordTimeModal event={eventEditor} close={() => setEventEditor(null)} update={app.updateEvent} />
      <NightWakeModal visible={nightWakeOpen} close={() => setNightWakeOpen(false)} save={saveNightWake} />
    </SafeAreaView>
  );
}

function LoadingScreen() {
  return <SafeAreaView style={[styles.safe, styles.center]}><ActivityIndicator color={colors.sageDark} /><Text style={styles.loadingText}>Uykuva hazırlanıyor…</Text></SafeAreaView>;
}

function StorageRecoveryScreen({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return <SafeAreaView style={[styles.safe, styles.storageRecovery]}><Text style={styles.onboardingBrand}>uykuva</Text><Text style={styles.pageTitle}>Kayıtlar açılamadı</Text><Text style={styles.pageIntro}>{message}</Text><Text style={styles.body}>Yükleme başarılı olana kadar boş bir profil kaydetmeyeceğiz. İnternet gerekmez; cihaz depolamasını kontrol edip yeniden deneyin.</Text><View style={styles.spacer24} /><PrimaryButton label="Yeniden dene" onPress={() => void onRetry()} /></SafeAreaView>;
}

function OnboardingScreen({ onComplete }: { onComplete: ReturnType<typeof useUykuvaState>["completeOnboarding"] }) {
  const defaultBirth = new Date();
  defaultBirth.setDate(defaultBirth.getDate() - 120);
  const [step, setStep] = useState<"welcome" | "profile">("welcome");
  const [babyName, setBabyName] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [birthDate, setBirthDate] = useState(defaultBirth.toISOString().slice(0, 10));
  const [gestationalWeek, setGestationalWeek] = useState("40");
  const [growthChartSex, setGrowthChartSex] = useState<"female" | "male" | undefined>();

  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.onboarding}>
        <View style={styles.onboardingMark}><Text style={styles.onboardingMoon}>☾</Text></View>
        <Text style={styles.onboardingBrand}>uykuva</Text>
        <Text style={styles.onboardingTitle}>Bebeğinizin ritmi, herkesin elinde.</Text>
        <Text style={styles.onboardingBody}>Uyku, beslenme ve günlük bakım kayıtlarını sakin bir akışta tutun. Tüm özellikler ücretsiz.</Text>
        <View style={styles.onboardingBottom}><PrimaryButton label="Başlayalım" onPress={() => setStep("profile")} /><Text style={styles.privacyLine}>Verileriniz şimdilik yalnızca bu cihazda saklanır.</Text></View>
      </SafeAreaView>
    );
  }

  const submit = () => {
    const week = Number(gestationalWeek);
    const birth = new Date(`${birthDate}T12:00:00`);
    if (!babyName.trim() || !caregiverName.trim()) return Alert.alert("Eksik bilgi", "Bebek ve bakım veren adını yazın.");
    if (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now()) return Alert.alert("Tarihi kontrol edin", "Doğum tarihini YYYY-AA-GG biçiminde ve geçmiş bir tarih olarak yazın.");
    if (!Number.isInteger(week) || week < 22 || week > 42) return Alert.alert("Haftayı kontrol edin", "Gebelik haftası 22–42 arasında olmalı.");
    onComplete({ babyName, caregiverName, birthDate, gestationalWeek: week, growthChartSex });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>İLK KURULUM</Text><Text style={styles.pageTitle}>Sizi tanıyalım</Text>
        <Text style={styles.pageIntro}>Bu bilgiler yaşa uygun uyku aralıklarını hesaplamak ve kayıtları kimin eklediğini göstermek için kullanılır.</Text>
        <Field label="Bebeğin adı" value={babyName} onChangeText={setBabyName} placeholder="Örn. Deniz" />
        <Field label="Doğum tarihi" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-AA-GG" keyboardType="numbers-and-punctuation" />
        <Field label="Doğduğu gebelik haftası" value={gestationalWeek} onChangeText={setGestationalWeek} placeholder="40" keyboardType="number-pad" />
        <Text style={styles.inputLabel}>WHO büyüme eğrisi (isteğe bağlı)</Text>
        <View style={styles.choiceRow}><Pill label="Kız çocuk" active={growthChartSex === "female"} onPress={() => setGrowthChartSex("female")} /><Pill label="Erkek çocuk" active={growthChartSex === "male"} onPress={() => setGrowthChartSex("male")} /><Pill label="Atla" active={!growthChartSex} onPress={() => setGrowthChartSex(undefined)} /></View>
        <Text style={styles.hint}>Seçim yapılmazsa persentil gösterilmez. WHO standartları büyüme eğrisini bu bilgiye göre ayırır.</Text>
        <Field label="Bakım veren adı veya rolü" value={caregiverName} onChangeText={setCaregiverName} placeholder="Örn. Anne, Baba, Ece" />
        <Card tone="peach"><Text style={styles.cardTitle}>Önemli sınır</Text><Text style={styles.body}>Uykuva kayıt ve genel rutin desteği sunar; tıbbi tanı veya tedavi sağlamaz. Sağlık endişesinde uzmanınıza danışın.</Text></Card>
        <PrimaryButton label="Profili oluştur" onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.inputLabel}>{label}</Text><TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} style={styles.input} placeholderTextColor="#93A09C" /></View>;
}

function SleepDayContextPicker({ selected, onSelect }: { selected?: SleepDayContext; onSelect: (context?: SleepDayContext) => void }) {
  return <>
    <Text style={styles.inputLabel}>Bugünün durumu · isteğe bağlı</Text>
    <View style={styles.choiceRow}>
      {sleepDayContextOptions.map((item) => <Pill key={item.id ?? "ordinary"} label={item.label} active={selected === item.id} onPress={() => onSelect(item.id)} />)}
    </View>
    {selected ? <Text style={styles.hint}>Bu işaret açıkken uyku penceresi ve uyku hatırlatmaları duraklatılır. Olağan güne döndüğünüzde “Olağan gün”ü seçin.</Text> : null}
  </>;
}

function TodayScreen({ app, forecast, feedingForecast, openLog, now, nightMode, onToggleNightMode, onLogNightWake, onSwitchCaregiver, onSwitchChild }: { app: ReturnType<typeof useUykuvaState>; forecast: ReturnType<typeof createSleepForecast>; feedingForecast: ReturnType<typeof createFeedingForecast>; openLog: (mode: LogMode) => void; now: Date; nightMode: boolean; onToggleNightMode: () => void; onLogNightWake: () => void; onSwitchCaregiver: () => void; onSwitchChild: () => void }) {
  const today = localDateValue(now);
  const todayCheckIn = app.state.sleepPlan.checkIns.find((item) => item.date === today);
  const newbornSummary = correctedAgeDays(app.state.baby, now) < 63;
  const summaryStart = new Date(now);
  if (newbornSummary) summaryStart.setTime(now.getTime() - 24 * 60 * 60 * 1000);
  else summaryStart.setHours(0, 0, 0, 0);
  const summaryEvents = app.state.events.filter((event) => {
    const start = new Date(event.startedAt).getTime();
    return Number.isFinite(start) && start >= summaryStart.getTime() && start <= now.getTime();
  });
  const summarySleepEvents = app.state.events.filter((event) => {
    if (event.kind !== "sleep") return false;
    const start = new Date(event.startedAt).getTime();
    const end = Math.min(event.endedAt ? new Date(event.endedAt).getTime() : now.getTime(), now.getTime());
    return Number.isFinite(start) && start < now.getTime() && end > summaryStart.getTime();
  });
  const summarySleepMinutes = summarySleepEvents.reduce((sum, event) => {
    const start = Math.max(new Date(event.startedAt).getTime(), summaryStart.getTime());
    const end = Math.min(event.endedAt ? new Date(event.endedAt).getTime() : now.getTime(), now.getTime());
    return sum + Math.max(0, end - start) / 60_000;
  }, 0);
  const summaryFeeding = todayFeedingTotals(app.state.events, now, newbornSummary);
  const summaryDiapers = summaryEvents.filter((event) => event.kind === "diaper").length;
  const summaryHealth = summaryEvents.filter((event) => event.kind === "health").length;
  const [morningWake, setMorningWake] = useState(todayCheckIn?.wakeTime ?? "");
  useEffect(() => setMorningWake(todayCheckIn?.wakeTime ?? ""), [todayCheckIn?.wakeTime, today]);
  const morningWakeClock = normalizeClockInput(morningWake);
  const morningWakeInputError = morningWake.length === 4 && !isValidClock(morningWakeClock)
    ? "Saat geçerli değil. 07:00 gibi 24 saat biçiminde girin."
    : undefined;
  const updateMorningWake = (value: string) => {
    // Keep digits raw while typing so `0700` is not reformatted after `070`.
    const digits = clockInputDigits(value);
    setMorningWake(digits);
    const wakeTime = normalizeClockInput(digits);
    // Wait for four digits before saving so a partially typed time is not persisted.
    if (digits.length === 4 && isTodayTimeReached(wakeTime) && todayCheckIn?.wakeTime !== wakeTime) {
      app.saveCheckIn({ ...todayCheckIn, date: today, wakeTime });
    }
  };
  const morningWakeForecast = (() => {
    if (!isValidClock(morningWakeClock)) return undefined;
    const [hour, minute] = morningWakeClock.split(":").map(Number);
    const wakeAt = new Date(now);
    wakeAt.setHours(hour!, minute!, 0, 0);
    if (hasSleepSinceWake(app.state.events, wakeAt)) return undefined;
    return createSleepForecast(app.state.baby, app.state.events, now, wakeAt, todayCheckIn?.dayContext);
  })();
  const morningWakeSleepRecorded = isValidClock(morningWakeClock) && (() => {
    const [hour, minute] = morningWakeClock.split(":").map(Number);
    const wakeAt = new Date(now);
    wakeAt.setHours(hour!, minute!, 0, 0);
    return hasSleepSinceWake(app.state.events, wakeAt);
  })();
  const displayedForecast = morningWakeForecast ?? forecast;
  const enabledRoutineMinutes = app.state.sleepPlan.routine.reduce((sum, item) => sum + (item.enabled ? item.minutes : 0), 0);
  const routineStartWindow = morningWakeForecast?.available && morningWakeForecast.start && morningWakeForecast.end && enabledRoutineMinutes > 0
    ? {
        start: new Date(morningWakeForecast.start.getTime() - enabledRoutineMinutes * 60_000),
        end: new Date(morningWakeForecast.end.getTime() - enabledRoutineMinutes * 60_000)
      }
    : undefined;
  const saveMorningWake = () => {
    if (!isValidClock(morningWakeClock)) return Alert.alert("Saati kontrol edin", "Uyanış saatini 07:00 gibi SS:DD biçiminde girin.");
    if (!isTodayTimeReached(morningWakeClock)) return Alert.alert("Saati kontrol edin", "Bugünün uyanış saati henüz gelmemiş. Gerçek uyanış saatini girin.");
    setMorningWake(morningWakeClock);
    app.saveCheckIn({ ...todayCheckIn, date: today, wakeTime: morningWakeClock });
  };
  const clearMorningWake = () => {
    setMorningWake("");
    if (todayCheckIn?.wakeTime) app.saveCheckIn({ ...todayCheckIn, date: today, wakeTime: undefined });
  };
  const confidence = { low: "İlk tahmin", medium: "Kişiselleşiyor", high: "Kişisel ritim" }[displayedForecast.confidence];
  const sleepWindowStatus = !displayedForecast.available || !displayedForecast.start || !displayedForecast.end
    ? undefined
    : now < displayedForecast.start
      ? `Uyku penceresine yaklaşık ${compactMinutes((displayedForecast.start.getTime() - now.getTime()) / 60_000)} var.`
      : now < displayedForecast.end
        ? `Uyku penceresi açık; tahmini aralığın bitmesine ${compactMinutes((displayedForecast.end.getTime() - now.getTime()) / 60_000)} var.`
        : "Tahmini aralık geçti; bebeğinizin uyku işaretlerine göre ilerleyin.";
  const sleepElapsed = app.runningSleep ? Math.max(0, Math.floor((now.getTime() - new Date(app.runningSleep.startedAt).getTime()) / 60_000)) : 0;
  const wakeEstimate = estimateSleepWakeWindow(app.state.events, app.runningSleep, now);
  const careWindowEnd = now.getTime() + 24 * 60 * 60 * 1000;
  const nextCareTasks = app.state.careTasks
    .filter((task) => !task.completedAt && new Date(task.dueAt).getTime() >= now.getTime() && new Date(task.dueAt).getTime() <= careWindowEnd)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const latestMedicationByName = new Map<string, CareEvent>();
  for (const event of app.state.events) {
    if (event.kind !== "health" || event.healthType !== "medicine" || !event.medicineName?.trim()) continue;
    const key = event.medicineName.trim().toLocaleLowerCase("tr-TR");
    const existing = latestMedicationByName.get(key);
    if (!existing || new Date(event.startedAt).getTime() > new Date(existing.startedAt).getTime()) latestMedicationByName.set(key, event);
  }
  const bedtimeTarget = isValidClock(app.state.sleepPlan.bedtime) ? new Date(now) : undefined;
  if (bedtimeTarget) {
    const [bedtimeHour, bedtimeMinute] = app.state.sleepPlan.bedtime.split(":").map(Number);
    bedtimeTarget.setHours(bedtimeHour!, bedtimeMinute!, 0, 0);
    if (bedtimeTarget.getTime() <= now.getTime()) bedtimeTarget.setDate(bedtimeTarget.getDate() + 1);
  }
  const napOutline = createDailyNapOutline(app.state.events, now);
  const agenda: { id: string; at: Date; kind: "sleep" | "feed" | "bedtime" | "care" | "medication"; label: string; detail: string; endAt?: Date; task?: CareTask }[] = [];
  if (displayedForecast.available && displayedForecast.start && displayedForecast.end) agenda.push({ id: "next-sleep", at: displayedForecast.start, endAt: displayedForecast.end, kind: "sleep", label: "Olası uyku penceresi", detail: "Sabah uyanış saati ve yaş aralığına dayalı tahmin; uyku işaretlerine göre esnetin." });
  if (feedingForecast.available && feedingForecast.start && feedingForecast.end) agenda.push({ id: "next-feed", at: feedingForecast.start, endAt: feedingForecast.end, kind: "feed", label: "Kayıtlı beslenme aralığı", detail: "Açlık işaretleri ve bebeğinizin ihtiyacı her zaman önceliklidir." });
  if (bedtimeTarget && bedtimeTarget.getTime() <= careWindowEnd) agenda.push({ id: "bedtime", at: bedtimeTarget, kind: "bedtime", label: "Hedef yatış", detail: "Uyku planınızdaki esnek hedef saat." });
  for (const event of latestMedicationByName.values()) {
    const reminderAt = event.medicationReminderAt ? new Date(event.medicationReminderAt) : undefined;
    if (!reminderAt || !Number.isFinite(reminderAt.getTime()) || reminderAt.getTime() < now.getTime() || reminderAt.getTime() > careWindowEnd) continue;
    agenda.push({ id: `medication-${event.id}`, at: reminderAt, kind: "medication", label: `İlaç planını kontrol et · ${event.medicineName}`, detail: "Bu saati siz girdiniz; doz veya tekrar aralığı önerisi değildir." });
  }
  nextCareTasks.forEach((task) => agenda.push({ id: task.id, at: new Date(task.dueAt), kind: "care", label: task.title, detail: task.type === "vaccine" ? "Aşı" : "Randevu", task }));
  napOutline.forEach((nap) => {
    if (nap.actualStart || nap.typical.getTime() <= now.getTime() || nap.typical.getTime() > careWindowEnd) return;
    if (displayedForecast.available && displayedForecast.end && nap.typical.getTime() <= displayedForecast.end.getTime()) return;
    agenda.push({ id: `nap-outline-${nap.order}`, at: nap.from.getTime() > now.getTime() ? nap.from : now, endAt: nap.to, kind: "sleep", label: `${nap.order}. gündüz uykusu taslağı`, detail: `Son 14 günde ${nap.sampleCount} günde kaydedilen saatlerin ortancası ${time(nap.typical)}; kesin program değildir.` });
  });
  agenda.sort((a, b) => a.at.getTime() - b.at.getTime());
  if (nightMode) return <NightModeScreen app={app} now={now} onExit={onToggleNightMode} openLog={openLog} onSwitchCaregiver={onSwitchCaregiver} onSwitchChild={onSwitchChild} />;
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset} showsVerticalScrollIndicator={false}>
      <Card tone="mint">
        <View style={styles.cardTopline}><Text style={styles.eyebrow}>{app.runningSleep ? "UYKU DEVAM EDİYOR" : "SIRADAKİ UYKU"}</Text><Text style={styles.confidence}>{app.runningSleep ? "Canlı süre" : confidence}</Text></View>
        <Text style={styles.heroTime}>{app.runningSleep ? `${Math.floor(sleepElapsed / 60) ? `${Math.floor(sleepElapsed / 60)} sa ` : ""}${sleepElapsed % 60} dk` : displayedForecast.available ? `${time(displayedForecast.start)}–${time(displayedForecast.end)}` : "Henüz hazır değil"}</Text>
        <Text style={styles.body}>{app.runningSleep ? `Uyku ${time(app.runningSleep.startedAt)} saatinde başladı. Bitirmek için aşağıdaki “Uyandı” kaydını kullanın.` : displayedForecast.explanation}</Text>
        {!app.runningSleep && sleepWindowStatus ? <Text style={styles.awake}>{sleepWindowStatus}</Text> : null}
        {app.runningSleep ? <Text style={styles.awake}>{wakeEstimate.available && wakeEstimate.from && wakeEstimate.typical && wakeEstimate.to ? `Benzer uykulara göre olası uyanma ${time(wakeEstimate.from)}–${time(wakeEstimate.to)} (ortanca ${time(wakeEstimate.typical)}). ${wakeEstimate.sampleCount} kayıt.` : wakeEstimate.explanation}</Text> : null}
        {!app.runningSleep && displayedForecast.awakeMinutes !== undefined ? <Text style={styles.awake}>{displayedForecast.awakeMinutes} dakikadır uyanık</Text> : null}
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Sabah uyanışına göre uyku penceresi</Text>
        <Text style={styles.body}>Uyanış saatini yazın; ilk gündüz uykusu aralığını hemen hesaplayalım.</Text>
        <View style={styles.timeFields}>
          <View style={styles.timeField}>
            <Text style={styles.inputLabel}>Bugün uyandığı saat</Text>
            <TextInput accessibilityLabel="Bugün sabah uyanış saati" accessibilityHint="Saati 0700 biçiminde yazın. Geçerli saat girildiğinde ilk uyku penceresi hesaplanır." value={morningWake} onChangeText={updateMorningWake} onBlur={() => { if (isValidClock(morningWakeClock)) setMorningWake(morningWakeClock); }} style={styles.compactInput} placeholder="0700" keyboardType="number-pad" maxLength={5} />
          </View>
          <View style={[styles.timeField, { justifyContent: "flex-end" }]}>
            <PrimaryButton label={todayCheckIn?.wakeTime === morningWakeClock ? "Kaydedildi" : "Saati kaydet"} quiet onPress={saveMorningWake} />
          </View>
        </View>
        {todayCheckIn?.wakeTime ? <><View style={styles.spacer12} /><PrimaryButton label="Uyanış saatini temizle" quiet onPress={clearMorningWake} /></> : null}
        {morningWakeInputError ? <Text accessibilityLiveRegion="polite" style={styles.inputError}>{morningWakeInputError}</Text> : morningWake.length > 0 && morningWake.length < 3 ? <Text style={styles.hint}>Saati rakamlarla yazın (ör. 0700 = 07:00).</Text> : null}
        <SleepDayContextPicker selected={todayCheckIn?.dayContext} onSelect={(dayContext) => app.saveCheckIn({ ...todayCheckIn, date: today, dayContext })} />
        {morningWakeForecast?.available && morningWakeForecast.start && morningWakeForecast.end ? (
          <View accessibilityLiveRegion="polite" style={styles.wakeForecastPanel}>
            <Text style={styles.eyebrow}>İLK GÜNDÜZ UYKUSU</Text>
            <Text style={styles.wakeForecastTime}>{time(morningWakeForecast.start)}–{time(morningWakeForecast.end)}</Text>
            {routineStartWindow ? <Text style={styles.body}>Etkin rutininiz {enabledRoutineMinutes} dk sürüyor; yaklaşık {time(routineStartWindow.start)}–{time(routineStartWindow.end)} arasında başlayabilirsiniz.</Text> : null}
            <Text style={styles.hint}>{morningWakeForecast.explanation}</Text>
          </View>
        ) : morningWakeForecast ? (
          <Text accessibilityLiveRegion="polite" style={styles.hint}>{morningWakeForecast.explanation}</Text>
        ) : morningWakeSleepRecorded ? (
          <View accessibilityLiveRegion="polite" style={styles.wakeForecastPanel}>
            <Text style={styles.eyebrow}>SIRADAKİ UYKU</Text>
            {displayedForecast.available && displayedForecast.start && displayedForecast.end ? (
              <>
                <Text style={styles.wakeForecastTime}>{time(displayedForecast.start)}–{time(displayedForecast.end)}</Text>
                <Text style={styles.hint}>İlk uyku kaydedildi; bu pencere son uyku kaydına göre hesaplandı.</Text>
              </>
            ) : <Text style={styles.hint}>{displayedForecast.explanation}</Text>}
          </View>
        ) : (
          <Text style={styles.hint}>Uyanış saatini girin (ör. 0700); ilk uyku penceresi burada anında görünür.</Text>
        )}
        <Text style={styles.hint}>Bu aralık tahmindir; bebeğinizin uyku işaretlerine göre esnetin.</Text>
      </Card>
      <SectionTitle title={newbornSummary ? "Son 24 saatin özeti" : "Bugün şu ana kadar"} />
      <View style={styles.statGrid}>
        <Stat value={`${Math.floor(summarySleepMinutes / 60)} sa ${Math.round(summarySleepMinutes % 60)} dk`} label="Kaydedilen uyku" tone="mint" />
        <Stat value={`${summaryFeeding.count}`} label="Beslenme" tone="peach" />
        <Stat value={`${summaryDiapers}`} label="Bez kaydı" tone="lavender" />
        <Stat value={`${summaryHealth}`} label="Sağlık kaydı" tone="white" />
      </View>
      <Text style={styles.hint}>Yalnızca bu aralıkta kaydedilenler sayılır; eksik kayıt olabilir. Bu sayılar sağlık değerlendirmesi değildir.</Text>
      <SectionTitle title="Önümüzdeki 24 saat" action={`${agenda.length} planlı aralık`} />
      <Card>
        {agenda.length ? agenda.map((item) => item.task
          ? <CareTaskRow key={item.id} task={item.task} onToggle={() => app.toggleCareTask(item.task!.id)} onDelete={() => app.deleteCareTask(item.task!.id)} />
          : <View key={item.id} style={styles.eventRow}><View style={[styles.eventDot, { backgroundColor: item.kind === "sleep" ? colors.sage : item.kind === "feed" ? colors.peach : colors.lavender }]} /><View style={styles.flex}><Text style={styles.eventTitle}>{item.label}</Text><Text style={styles.muted}>{item.detail}</Text></View><Text style={styles.taskDate}>{time(item.at)}{item.endAt ? `–${time(item.endAt)}` : ""}</Text></View>) : <Text style={styles.body}>Kişisel tahmin için kayıtlar öğreniliyor. Uyku ve beslenme kaydı ekledikçe olası aralıklar burada görünür.</Text>}
        <Text style={styles.hint}>Uyku ve beslenme aralıkları tahmindir; kesin program değildir. Aşı ve randevu tarihlerini sağlık uzmanınızla belirleyin.</Text>
      </Card>

      <SectionTitle title="Hızlı kayıt" />
      <Pressable accessibilityRole="button" accessibilityLabel="Gece moduna geç" accessibilityHint="Gece ekranında uyku sayacını, beslenmeyi ve bez kaydını hızlıca açabilirsiniz." onPress={onToggleNightMode} style={styles.nightEntry}><Text style={styles.nightEntryText}>Gece moduna geç  ☾</Text></Pressable>
      <View style={styles.quickRow}>
        <QuickAction glyph={app.runningSleep ? "■" : "☾"} label={app.runningSleep ? "Uyandı" : "Uyku"} onPress={app.toggleSleep} active={Boolean(app.runningSleep)} />
        <QuickAction glyph="◉" label="Uyanma" onPress={onLogNightWake} />
        <QuickAction glyph="◒" label={app.runningFeed ? "Emzirme sürüyor" : "Beslenme"} onPress={() => openLog("feed")} active={Boolean(app.runningFeed)} />
        <QuickAction glyph="◇" label="Bez" onPress={() => openLog("diaper")} />
        <QuickAction glyph="＋" label="Sağlık" onPress={() => openLog("health")} />
        <QuickAction glyph="↗" label="Büyüme" onPress={() => openLog("growth")} />
        <QuickAction glyph="＋" label="Not" onPress={() => openLog("note")} />
        <QuickAction glyph="♡" label="Anı" onPress={() => openLog("memory")} />
      </View>

      <SectionTitle title="Bakım devri" action={`Son ${app.state.preferences.handoffHours} saat`} />
      <Card tone="peach">
        <Text style={styles.cardTitle}>Herkes aynı sayfada</Text>
        <Text style={styles.body}>{handoffSummary(app.state, new Date(), app.state.preferences.handoffHours)}</Text>
        <View style={styles.spacer12} />
        <PrimaryButton label="Özeti paylaş" quiet onPress={() => void Share.share({ message: `${app.state.baby.name} · ${handoffSummary(app.state, new Date(), app.state.preferences.handoffHours)}` })} />
      </Card>

      <SectionTitle title="Son kayıtlar" action="Tümünü gör" />
      <Card>{app.state.events.slice(0, 4).map((event) => <EventRow key={event.id} event={event} />)}</Card>
      <Text style={styles.disclaimer}>Uykuva tıbbi tanı veya tedavi önermez. Endişeniz varsa sağlık uzmanınıza başvurun.</Text>
    </ScrollView>
  );
}

function NightModeScreen({ app, now, onExit, openLog, onSwitchCaregiver, onSwitchChild }: { app: ReturnType<typeof useUykuvaState>; now: Date; onExit: () => void; openLog: (mode: LogMode) => void; onSwitchCaregiver: () => void; onSwitchChild: () => void }) {
  const elapsed = app.runningSleep ? Math.max(0, Math.floor((now.getTime() - new Date(app.runningSleep.startedAt).getTime()) / 60_000)) : 0;
  return (
    <View style={styles.nightScreen}>
      <View style={styles.nightTop}>
        <View><Text style={styles.nightEyebrow}>UYKUVA · GECE MODU</Text><Text style={styles.nightBaby}>{app.state.baby.name}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Gece modundan çık" onPress={onExit} style={styles.nightExit}><Text style={styles.nightExitText}>Çık</Text></Pressable>
      </View>
      {app.state.caregivers.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Aktif bakım veren ${app.state.caregiverName}. Sonraki bakım verene geç`} onPress={onSwitchCaregiver} style={styles.nightCaregiver}><Text style={styles.nightCaregiverText}>Bakımı devralan: {app.state.caregiverName} · Değiştir</Text></Pressable> : null}
      {app.state.children.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Aktif çocuk ${app.state.baby.name}. Sonraki çocuğa geç`} onPress={onSwitchChild} style={styles.nightCaregiver}><Text style={styles.nightCaregiverText}>Çocuk: {app.state.baby.name} · Değiştir</Text></Pressable> : null}
      <View style={styles.nightTimerCard}>
        <Text style={styles.nightEyebrow}>{app.runningSleep ? "UYKU SÜRESİ" : "GECE KAYDI"}</Text>
        <Text style={styles.nightTimer}>{app.runningSleep ? `${Math.floor(elapsed / 60)} sa ${elapsed % 60} dk` : "Hazır"}</Text>
        <Text style={styles.nightHint}>{app.runningSleep ? `Uyku ${time(app.runningSleep.startedAt)} saatinde başladı` : "Gece bakım kaydını buradan yönetebilirsin."}</Text>
      </View>
      <View style={styles.nightActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={app.runningSleep ? "Uykuyu bitir ve uyanma kaydı oluştur" : "Uyku zamanlayıcısını başlat"} accessibilityHint={app.runningSleep ? "Gerçek uyanış saatini şimdi kaydeder." : "Uyku başlangıç saatini kaydeder."} onPress={app.toggleSleep} style={[styles.nightAction, styles.nightActionPrimary]}>
          <Text style={styles.nightActionGlyph}>{app.runningSleep ? "■" : "☾"}</Text><Text style={styles.nightActionTitle}>{app.runningSleep ? "Uykuyu bitir" : "Uykuyu başlat"}</Text><Text style={styles.nightActionHint}>{app.runningSleep ? "Uyanma kaydı ekle" : "Uyku sayacını başlat"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Beslenme kaydı aç" onPress={() => openLog("feed")} style={styles.nightAction}><Text style={styles.nightActionGlyph}>◉</Text><Text style={styles.nightActionTitle}>Beslenme</Text><Text style={styles.nightActionHint}>Beslenme kaydı aç</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Bez kaydı aç" onPress={() => openLog("diaper")} style={styles.nightAction}><Text style={styles.nightActionGlyph}>◇</Text><Text style={styles.nightActionTitle}>Bez</Text><Text style={styles.nightActionHint}>Bez kaydı aç</Text></Pressable>
      </View>
      <Text style={styles.nightFootnote}>Kısık renkli ekran · Gece modundan çıkmak için üstteki düğmeyi kullan.</Text>
    </View>
  );
}

function TimelineScreen({ events, caregivers, onDelete, onEditSleep, onEditRecord, onAddSleep }: { events: CareEvent[]; caregivers: string[]; onDelete: (id: string) => void; onEditSleep: (event: CareEvent) => void; onEditRecord: (event: CareEvent) => void; onAddSleep: () => void }) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [caregiverFilter, setCaregiverFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const caregiverOptions = [...new Set([...caregivers, ...events.map((event) => event.caregiver)])].filter(Boolean);
  const filtered = events.filter((event) => {
    const matchesFilter = filter === "all"
      || filter === "sleep" && event.kind === "sleep"
      || filter === "feeding" && event.kind === "feed" && event.feedType !== "pump"
      || filter === "pumping" && event.kind === "feed" && event.feedType === "pump"
      || filter === "diaper" && event.kind === "diaper"
      || filter === "health" && event.kind === "health"
      || filter === "growth" && event.kind === "growth"
      || filter === "notes" && event.kind === "note"
      || filter === "memories" && event.kind === "memory";
    if (!matchesFilter || (caregiverFilter !== null && event.caregiver !== caregiverFilter)) return false;
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedQuery) return true;
    const searchable = [eventTitle(event), event.caregiver, event.note, event.medicineName, event.memoryTitle, event.foods?.join(" ")].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
    return searchable.includes(normalizedQuery);
  });
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Günün akışı</Text>
      <Text style={styles.pageIntro}>Kayıtları türüne veya bakım veren adına göre bulun. Kayda dokunup saatini düzenleyin; silmek için basılı tutup onaylayın.</Text>
      <TextInput accessibilityLabel="Zaman çizelgesinde kayıt veya bakım veren ara" value={query} onChangeText={setQuery} style={styles.input} placeholder="Kayıt veya bakım veren ara" placeholderTextColor="#93A09C" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>{timelineFilters.map((item) => <Pill key={item.id} label={item.label} active={filter === item.id} onPress={() => setFilter(item.id)} />)}</ScrollView>
      {caregiverOptions.length > 1 ? <><Text style={styles.inputLabel}>Bakım veren</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}><Pill label="Tümü" active={caregiverFilter === null} onPress={() => setCaregiverFilter(null)} />{caregiverOptions.map((name) => <Pill key={name} label={name} active={caregiverFilter === name} onPress={() => setCaregiverFilter(name)} />)}</ScrollView></> : null}
      <PrimaryButton label="Geçmiş uyku ekle" quiet onPress={onAddSleep} />
      <View style={styles.spacer12} />
      <Card>{filtered.length ? filtered.map((event) => <EventRow key={event.id} event={event} onPress={() => event.kind === "sleep" ? onEditSleep(event) : onEditRecord(event)} onDelete={() => onDelete(event.id)} />) : <Text style={styles.body}>Bu arama ve filtreyle eşleşen kayıt yok.</Text>}</Card>
    </ScrollView>
  );
}

function nightWakingGuide(stage: "newborn" | "foundations" | "plan", method: SleepMethod) {
  if (stage === "newborn") return {
    title: "Yeni doğanda uyku eğitimi yok; ihtiyaçlara yanıt öncelikli.",
    steps: ["Açlık, bez, yakınlık veya rahatsızlık işaretlerini kontrol edin.", "Beslenme ve sakinleşme ihtiyacına gecikmeden yanıt verin; gece ortamını sakin ve loş tutun.", "Bu aşamada kendi kendine uyumayı hedefleyen plan uygulamayın."]
  };
  if (stage === "foundations") return {
    title: "Şimdilik odak tutarlı rutin ve bebeğin işaretleri.",
    steps: ["Önce beslenme, bez, ağrı ve hastalık gibi temel ihtiyaçları değerlendirin.", "Sakin ses ve yakınlıkla destek verin; bebeğinizin işaretlerine göre kucağa alın.", "Desteği azaltmak zorunda değilsiniz; öngörülebilir akşam sırasını koruyun."]
  };
  const steps: Record<SleepMethod, string[]> = {
    responsive: ["Önce temel ihtiyaçları ve güvenliği kontrol edin; beslenme ihtiyacını plana göre ertelemeyin.", "Yakınında kalıp sesinizle ve nazik dokunuşla sakinleştirin.", "Huzursuzluğu artarsa kucağa alıp sakinleştirin; hazır olduğunda tekrar yatırın."],
    gradual: ["Önce temel ihtiyaçları ve güvenliği kontrol edin; beslenme ihtiyacını plana göre ertelemeyin.", "Bu gece için seçtiğiniz küçük destek adımını yalnızca bebek sakinse deneyin.", "Huzursuzluk artarsa önceki desteğe dönüp sakinleştirin; adım azaltmak zorunlu değildir."],
    timedChecks: ["Önce açlık, bez, ağrı, hastalık ve güvenlik gibi temel ihtiyaçları değerlendirin; bunları hiçbir zaman bekletmeyin.", "Yalnızca önceden kararlaştırdığınız kısa kontrol düzeni size ve bebeğinize uygunsa sakin bir kontrol yapın.", "Ağlama artarsa, bebeğiniz iyi görünmüyorsa veya siz zorlanıyorsanız süreyi beklemeden destek verin ve planı durdurun."],
    camping: ["Önce temel ihtiyaçları ve güvenliği kontrol edin; beslenme ihtiyacını plana göre ertelemeyin.", "Yatağın yanında kalıp sesinizle ve nazik dokunuşla destek verin.", "Mesafeyi yalnızca aile ve bebek hazır olduğunda, küçük adımlarla artırın."],
    bedtimeFading: ["Son günlerdeki uyku başlangıçlarını ve bebeğinizin işaretlerini gözden geçirin.", "Hedef yatışı yalnızca küçük bir adımla ayarlayın; çok yorgunluk veya huzursuzluk varsa önceki düzene dönün.", "Beslenme ve gece bakımını saate göre ertelemeyin."],
    pickUpPutDown: ["Açlık, rahatsızlık, bez ve sağlık gibi temel ihtiyaçları önce kontrol edin.", "Bebeğiniz belirgin huzursuzsa kucağa alıp sakinleşene kadar destek olun.", "Rahatlayınca güvenli uyku alanına sırtüstü geri yatırın; ihtiyaç duyarsa yeniden destek verin."],
    routineFirst: ["Kısa, sakin ve tekrarlanabilir bir akşam sırası uygulayın.", "Bebeğinizin uyku işaretlerine göre rutini kısaltın veya ara verin.", "Uykuya geçişte ihtiyaç duyduğu desteği verin; desteği azaltmak zorunlu değildir."]
  };
  return { title: `${methodDescription(method).name} yaklaşımı · gece uyanması`, steps: steps[method] };
}

function CoachScreen({ app, now }: { app: ReturnType<typeof useUykuvaState>; now: Date }) {
  const today = localDateValue(now);
  const todayCheckIn = app.state.sleepPlan.checkIns.find((item) => item.date === today);
  const coachingPausedToday = isSleepPlanPausedToday(app.state.sleepPlan, today);
  const stage = sleepProgramStage(app.state.baby);
  const readyItems = app.state.sleepPlan.readinessCompleted;
  const trainingReady = stage.canReduceSupport && SLEEP_READINESS_ITEMS.every((item) => readyItems.includes(item));
  const coachingMethod = trainingReady ? app.state.sleepPlan.method : "responsive";
  const plan = coachingDay(app.state.sleepPlan.day, coachingMethod, trainingReady, correctedAgeDays(app.state.baby), app.state.sleepPlan.focus);
  const planCheckInComparison = compareSleepPlanCheckIns(app.state.sleepPlan.completedDays, app.state.sleepPlan.checkIns, coachingMethod, app.state.sleepPlan.focus);
  const sleepCoachGuidance = createSleepCoachGuidance(app.state.sleepPlan.checkIns, now);
  const completedTodayCount = plan.tasks.filter((task) => app.state.sleepPlan.completedToday.includes(task)).length;
  const napOutline = createDailyNapOutline(app.state.events);
  const napPattern = compareNapPatterns(app.state.events);
  const insights = createSleepCoachInsights(app.state.events, app.state.sleepPlan.bedtime, app.state.sleepPlan.checkIns);
  const methods: SleepMethod[] = trainingReady ? ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"] : ["responsive"];
  const alreadyAdvancedToday = app.state.sleepPlan.lastAdvancedDate === today;
  const programCompleted = Boolean(app.state.sleepPlan.completedDate);
  const completedPlanRuns = app.state.sleepPlan.completedRuns ?? [];
  const completedProgramDays = programCompleted ? 14 : Math.max(0, app.state.sleepPlan.day - 1);
  const nightSummary = summarizeNightSleep(app.state.events, todayCheckIn, now);
  const oldestNight = new Date(now);
  oldestNight.setDate(oldestNight.getDate() - 6);
  const recentNightSummaries = app.state.sleepPlan.checkIns
    .filter((item) => item.date >= localDateValue(oldestNight) && item.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((checkIn) => ({ checkIn, summary: summarizeNightSleep(app.state.events, checkIn, now) }))
    .filter((item) => item.summary.minutes > 0 || item.checkIn.nightWakings !== undefined);
  const [nightBedtime, setNightBedtime] = useState(todayCheckIn?.bedtime ?? "");
  const [morningWake, setMorningWake] = useState(todayCheckIn?.wakeTime ?? "");
  useEffect(() => {
    setNightBedtime(todayCheckIn?.bedtime ?? "");
    setMorningWake(todayCheckIn?.wakeTime ?? "");
  }, [today, todayCheckIn?.bedtime, todayCheckIn?.wakeTime]);
  const morningWakeClock = normalizeClockInput(morningWake);
  const updateCoachMorningWake = (value: string) => {
    // Preserve the typed digits until the full time is entered.
    setMorningWake(clockInputDigits(value));
  };
  const coachMorningWakeInputError = morningWake.length === 4 && !isValidClock(morningWakeClock)
    ? "Saat geçerli değil. 07:00 gibi 24 saat biçiminde girin."
    : undefined;
  const morningWakeHasSleep = isValidClock(morningWakeClock) && (() => {
    const [hour, minute] = morningWakeClock.split(":").map(Number);
    const wakeAt = new Date(now);
    wakeAt.setHours(hour!, minute!, 0, 0);
    return hasSleepSinceWake(app.state.events, wakeAt);
  })();
  const morningWakeForecast = (() => {
    if (!isValidClock(morningWakeClock)) return undefined;
    const [hour, minute] = morningWakeClock.split(":").map(Number);
    const wakeAt = new Date(now);
    wakeAt.setHours(hour!, minute!, 0, 0);
    return createSleepForecast(app.state.baby, app.state.events, now, morningWakeHasSleep ? undefined : wakeAt, todayCheckIn?.dayContext);
  })();
  const nightSpanMinutes = isValidClock(nightBedtime) && isValidClock(morningWakeClock)
    ? (() => {
      const [bedHour, bedMinute] = nightBedtime.split(":").map(Number);
      const [wakeHour, wakeMinute] = morningWakeClock.split(":").map(Number);
      const span = (wakeHour! * 60 + wakeMinute! - bedHour! * 60 - bedMinute! + 1440) % 1440;
      return span > 0 ? span : undefined;
    })()
    : undefined;
  const [bedtime, setBedtime] = useState(app.state.sleepPlan.bedtime);
  const [wakeTime, setWakeTime] = useState(app.state.sleepPlan.wakeTime);
  const [routineLabel, setRoutineLabel] = useState("");
  const [routineMinutes, setRoutineMinutes] = useState("5");
  const [routineRunnerOpen, setRoutineRunnerOpen] = useState(false);
  const [nightGuideOpen, setNightGuideOpen] = useState(false);
  const [methodGuideOpen, setMethodGuideOpen] = useState(false);
  const [sleepBasicsOpen, setSleepBasicsOpen] = useState(false);
  const [wakeWindowGuideOpen, setWakeWindowGuideOpen] = useState(false);
  const [awakePatternOpen, setAwakePatternOpen] = useState(false);
  const wakeWindows = wakeWindowGuide(app.state.baby, now);
  const awakeWindowInsights = createAwakeWindowInsights(app.state.events, now);
  const nightGuide = nightWakingGuide(stage.id, coachingMethod);
  const saveSchedule = () => {
    if (!isValidClock(bedtime) || !isValidClock(wakeTime)) return Alert.alert("Saatleri kontrol edin", "Saatleri 20:00 gibi SS:DD biçiminde yazın.");
    app.updateSleepSchedule(bedtime, wakeTime);
  };
  const saveNightSummary = () => {
    if (!nightBedtime.trim() && !morningWake.trim()) return Alert.alert("Saatleri girin", "İsterseniz yalnızca yatış veya sabah uyanış saatini de kaydedebilirsiniz.");
    if ((nightBedtime.trim() && !isValidClock(nightBedtime)) || (morningWake.trim() && !isValidClock(morningWakeClock))) return Alert.alert("Saat biçimini kontrol edin", "Saatleri 20:30 gibi SS:DD biçiminde yazın.");
    if (morningWake.trim() && !isTodayTimeReached(morningWakeClock)) return Alert.alert("Saati kontrol edin", "Bugünün uyanış saati henüz gelmemiş. Gerçek uyanış saatini girin.");
    if (nightBedtime && morningWakeClock && nightBedtime === morningWakeClock) return Alert.alert("Saatleri kontrol edin", "Yatış ve sabah uyanış saati aynı olamaz.");
    setMorningWake(morningWakeClock);
    app.saveCheckIn({ ...todayCheckIn, date: today, bedtime: nightBedtime.trim() || undefined, wakeTime: morningWake.trim() ? morningWakeClock : undefined });
  };
  const confirmDeleteNightWake = (id: string) => Alert.alert("Uyanma kaydını sil?", "Bu kayıt bakım devri ve doktor özetinden de kaldırılır.", [
    { text: "Vazgeç", style: "cancel" },
    { text: "Kaydı sil", style: "destructive", onPress: () => app.saveCheckIn({ ...todayCheckIn, date: today, nightWakeLogs: (todayCheckIn?.nightWakeLogs ?? []).filter((log) => log.id !== id) }) }
  ]);
  const addRoutine = () => {
    const minutes = Number(routineMinutes);
    if (!routineLabel.trim() || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) return Alert.alert("Adımı kontrol edin", "Bir ad ve 1–60 dakika arasında süre yazın.");
    app.addRoutineStep(routineLabel, minutes); setRoutineLabel(""); setRoutineMinutes("5");
  };
  const sharePlan = () => {
    const enabledRoutine = app.state.sleepPlan.routine.filter((item) => item.enabled);
    const shareCheckIns = app.state.sleepPlan.checkIns
      .filter((item) => item.date >= localDateValue(oldestNight) && item.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
    const comparisonLines = planCheckInComparison.available ? [
      `Kolaylık karşılaştırması (ilk 3 / son 3 plan günü): ${planCheckInComparison.firstEaseAverage === undefined ? "yeterli kayıt yok" : `${planCheckInComparison.firstEaseAverage.toFixed(1)}/5`} / ${planCheckInComparison.recentEaseAverage === undefined ? "yeterli kayıt yok" : `${planCheckInComparison.recentEaseAverage.toFixed(1)}/5`}`,
      `Gece uyanma ortalaması: ${planCheckInComparison.firstWakingsAverage === undefined ? "ilk dönemde kayıt yok" : planCheckInComparison.firstWakingsAverage.toFixed(1)} / ${planCheckInComparison.recentWakingsAverage === undefined ? "son dönemde kayıt yok" : planCheckInComparison.recentWakingsAverage.toFixed(1)} (5+ uyanma sayıları ortalamaya katılmaz)`
    ] : [];
    const message = [
      `Uykuva · ${app.state.baby.name} için uyku planı`,
      `Yaş aşaması: ${stage.label}`,
      `Yaklaşım: ${methodDescription(coachingMethod).name}`,
      `Yaklaşım özeti: ${methodDescription(coachingMethod).support}`,
      `Bakım veren uygulaması: ${methodDescription(coachingMethod).caregiverRole}`,
      `Gece uyanınca: ${methodDescription(coachingMethod).nightResponse}`,
      `Yöntem özellikleri · huzursuzluk: ${methodDescription(coachingMethod).comparison.protest} · yakınlık: ${methodDescription(coachingMethod).comparison.presence} · uygulama yükü: ${methodDescription(coachingMethod).comparison.effort} · ilerleme: ${methodDescription(coachingMethod).comparison.pace}`,
      `Plan odağı: ${sleepFocusOptions.find((item) => item.id === app.state.sleepPlan.focus)?.label ?? "Akşam rutini"}`,
      `Program durumu: ${app.state.sleepPlan.paused ? "Duraklatıldı; günlük plan adımları beklemede." : programCompleted ? "14 günlük rehber tamamlandı." : `${app.state.sleepPlan.day}/14. gün`}`,
      `Günlük rehber: ${plan.title}`,
      `Hedef yatış: ${app.state.sleepPlan.bedtime} · Sabah başlangıcı: ${app.state.sleepPlan.wakeTime}`,
      "Akşam rutini:",
      ...enabledRoutine.map((item, index) => `${index + 1}. ${item.label} (${item.minutes} dk)`),
      ...(!app.state.sleepPlan.paused && !programCompleted ? ["Bugünün adımları:", ...plan.tasks.map((task) => `• ${task}`)] : []),
      ...comparisonLines,
      ...(shareCheckIns.length ? ["Son 7 gecenin check-in'leri:", ...shareCheckIns.map((item) => `- ${item.date}${item.ease === undefined ? "" : ` · kolaylık ${item.ease}/5`}${item.nightWakings === undefined ? "" : ` · uyanma ${item.nightWakings === 5 ? "5+" : item.nightWakings}`}${item.bedtime ? ` · yatış ${item.bedtime}` : ""}${item.wakeTime ? ` · uyanış ${item.wakeTime}` : ""}${item.note ? ` · not: ${item.note}` : ""}`)] : []),
      "Bebeğin sinyallerine göre esnetin; yoğun huzursuzluk veya sağlık endişesinde planı durdurup sağlık uzmanınıza danışın."
    ].join("\n");
    void Share.share({ title: `${app.state.baby.name} için uyku planı`, message });
  };
  const startRoutine = () => {
    if (!app.state.sleepPlan.routine.some((item) => item.enabled)) return Alert.alert("Etkin adım yok", "Önce akşam rutininize en az bir adım ekleyip etkinleştirin.");
    setRoutineRunnerOpen(true);
  };
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Uyku planı</Text>
      <Text style={styles.pageIntro}>Katı kurallar değil; bebeğinizin sinyallerine göre ayarlanabilen 14 günlük nazik bir plan.</Text>
      <Card>
        <View style={styles.cardTopline}><Text style={styles.eyebrow}>PROGRAM İLERLEYİŞİ</Text><Text style={styles.confidence}>{completedProgramDays}/14 gün</Text></View>
        <View accessible accessibilityLabel={`14 günlük program: ${completedProgramDays} gün tamamlandı${programCompleted ? "" : `, ${app.state.sleepPlan.day}. gün`}`} style={styles.planProgressBar}>{Array.from({ length: 14 }, (_, index) => <View key={index} accessible={false} style={[styles.planProgressSegment, index < completedProgramDays && styles.planProgressComplete, index === app.state.sleepPlan.day - 1 && !programCompleted && styles.planProgressCurrent]} />)}</View>
        <Text style={styles.body}>{programCompleted ? "14 günlük rehber tamamlandı. Uyku ve sabah check-in kayıtlarını kullanmaya devam edebilirsiniz." : `Şu an ${app.state.sleepPlan.day}. gündesiniz${alreadyAdvancedToday ? "; sıradaki gün yarın açılır" : ""}.`}</Text>
        {programCompleted ? <View style={styles.spacer12} /> : null}
        {programCompleted ? <PrimaryButton label="Yeni 14 günlük programa başla" onPress={app.restartSleepPlan} /> : null}
      </Card>
      {sleepCoachGuidance ? <Card tone={sleepCoachGuidance.tone}><Text style={styles.eyebrow}>SON CHECK-IN'E GÖRE</Text><Text style={styles.cardTitle}>{sleepCoachGuidance.title}</Text><Text style={styles.body}>{sleepCoachGuidance.body}</Text></Card> : null}
      <Card>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: nightGuideOpen }} onPress={() => setNightGuideOpen((open) => !open)} style={styles.nightGuideHeader}>
          <View style={styles.nightGuideHeaderText}><Text style={styles.cardTitle}>Gece uyanırsa ne yapmalı?</Text><Text style={styles.body}>{nightGuide.title}</Text></View>
          <Text style={styles.nightGuideChevron}>{nightGuideOpen ? "−" : "+"}</Text>
        </Pressable>
        {nightGuideOpen ? <View style={styles.nightGuideContent}>
          {nightGuide.steps.map((step, index) => <View key={index} style={styles.nightGuideStep}><Text style={styles.nightGuideNumber}>{index + 1}</Text><Text style={[styles.body, styles.nightGuideStepText]}>{step}</Text></View>)}
          {correctedAgeDays(app.state.baby) < 365 ? <Text style={styles.hint}>Her uykuda sırtüstü, sert ve düz, ayrı bir uyku yüzeyi kullanın. İlk 6 ay aynı odada ama ayrı uyku alanında uyuması önerilir; yatağı paylaşmayın, başını örtmeyin ve aşırı sıcak tutmayın.</Text> : null}
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx")}><Text style={styles.linkText}>AAP güvenli uyku rehberini aç</Text></Pressable>
        </View> : null}
      </Card>
      <Card>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: sleepBasicsOpen }} onPress={() => setSleepBasicsOpen((open) => !open)} style={styles.nightGuideHeader}>
          <View style={styles.nightGuideHeaderText}><Text style={styles.cardTitle}>Uyku hakkında kısa rehber</Text><Text style={styles.body}>Rutin, gece uyanmaları ve güvenli uyku</Text></View>
          <Text style={styles.nightGuideChevron}>{sleepBasicsOpen ? "−" : "+"}</Text>
        </Pressable>
        {sleepBasicsOpen ? <View style={styles.nightGuideContent}>
          <Text style={styles.inputLabel}>Her bebeğin ritmi farklıdır</Text>
          <Text style={styles.body}>Uyku süresi ve uyanma düzeni bebekler arasında değişir. Özellikle ilk aylarda kısa uyku aralıkları ve beslenme için uyanmalar olağandır; tek bir saat çizelgesi her aileye uymaz.</Text>
          <Text style={styles.inputLabel}>Yorgunluk işaretlerine bakın</Text>
          <Text style={styles.body}>Esneme, bakışı kaçırma, göz kapaklarının düşmesi, gözleri ovuşturma veya oyuna ilgide azalma bazı bebeklerde görülebilir. İşaretler bebekten bebeğe ve yaşla değişir; tek başına kesin uyku zamanı sayılmaz. Fark ettiğinizde ortamı sakinleştirin ve açlık ya da rahatsızlık gibi diğer ihtiyaçları da kontrol edin.</Text>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.healthychildren.org/English/ages-stages/baby/pages/How-Do-Infants-Learn.aspx").catch(() => Alert.alert("Bağlantı açılamadı", "AAP bebek işaretleri bilgisine şu anda ulaşılamıyor."))}><Text style={styles.linkText}>AAP · Bebeğinizin uyku işaretlerini tanıma</Text></Pressable>
          <Text style={styles.inputLabel}>Sakin, tekrarlanabilir bir rutin deneyin</Text>
          <Text style={styles.body}>Benzer sırayla yapılan kısa ve sakin adımlar uykuya geçişi kolaylaştırabilir. Ailenize uyan adımları seçin; bebeğinizin işaretlerine göre rutini kısaltabilir veya ara verebilirsiniz.</Text>
          <Text style={styles.inputLabel}>Gece uyanınca önce ihtiyacı değerlendirin</Text>
          <Text style={styles.body}>Açlık, bez, rahatsızlık ve yakınlık ihtiyacını kontrol edin. Gece bakımını düşük ışıkta ve sakin tutmak yardımcı olabilir; beslenmeyi veya gerekli bakımı uyku planı uğruna ertelemeyin.</Text>
          <Text style={styles.inputLabel}>Bebekler için güvenli uyku</Text>
          <Text style={styles.body}>Bebeği her uykuda sırtüstü, sert ve düz, ayrı bir uyku yüzeyine yatırın. İlk 6 ay aynı odada ama ayrı uyku alanında uyuması önerilir. Yastık, yorgan, oyuncak ve gevşek örtüleri uyku alanından çıkarın. Başını örtmeyin, aşırı sıcak tutmayın ve yetişkin yatağını paylaşmayın.</Text>
          <Text style={styles.inputLabel}>Ne zaman sağlık yardımı alınmalı?</Text>
          <Text style={styles.body}>Nefes almada güçlük, uzayan veya tekrarlayan nefes duraklamaları, sık ya da yüksek sesli horlama, beslenmeyi zorlaştıran nefes sorunu veya alışılmadık uykuya meyil fark ederseniz çocuk doktorunuzla görüşün. Nefes alamama, soluk ya da morarma veya bebeğin zor uyandırılması acil yardım gerektirir. Böyle bir durumda uyku planını uygulamaya devam etmeyin.</Text>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Sleep-Apnea-Detection.aspx").catch(() => Alert.alert("Bağlantı açılamadı", "AAP sağlık bilgisine şu anda ulaşılamıyor."))}><Text style={styles.linkText}>AAP · Uykuda solunum belirtileri ve ne zaman yardım alınmalı</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.nhs.uk/baby/health/when-to-get-urgent-medical-help-for-babies-and-children-under-5/").catch(() => Alert.alert("Bağlantı açılamadı", "NHS acil yardım rehberine şu anda ulaşılamıyor."))}><Text style={styles.linkText}>NHS · Bebeklerde acil yardım gerektiren belirtiler</Text></Pressable>
          <Text style={styles.inputLabel}>Bir yaklaşımı tüm bakım verenlerle konuşun</Text>
          <Text style={styles.body}>Kimlerin hangi desteği vereceğini, beslenme ve rahatlatma ihtiyaçlarına nasıl yanıt verileceğini ve hangi durumda planı bırakacağınızı önceden konuşun. Aynı yaklaşımda buluşamıyorsanız seçim yapmak zorunda değilsiniz; duyarlı rutinle devam edebilir veya konuyu daha sonra yeniden değerlendirebilirsiniz.</Text>
          <Text style={styles.inputLabel}>Zor günlerde ara verin</Text>
          <Text style={styles.body}>Hastalık, ağrı, seyahat veya düzen değişikliği olduğunda koçluk planını erteleyin. Uyku ekranındaki gün bağlamı seçimi günlük koçluk adımlarını bekletir; bakım kayıtları sürer ve olağan güne dönünce plan kaldığı yerden devam eder.</Text>
          {!stage.canReduceSupport ? <Text style={styles.hint}>Bu yaş aşamasında desteği azaltma yaklaşımı sunulmuyor. Uyku işaretleri, güvenli uyku ve duyarlı bakım önceliklidir.</Text> : null}
          {trainingReady ? <><View style={styles.spacer12} /><PrimaryButton label="Uyku yaklaşımlarını karşılaştır" quiet onPress={() => { setSleepBasicsOpen(false); setMethodGuideOpen(true); }} /></> : null}
          <Text style={styles.hint}>Uyku eğitimi zorunlu değildir. Uyku yaklaşımı seçseniz bile beslenme, hastalık, güvenlik ve yoğun huzursuzluk işaretleri her zaman önceliklidir. Kişisel sağlık sorularında çocuk doktorunuza danışın.</Text>
          <Text style={styles.inputLabel}>Kaynaklar</Text>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/").catch(() => Alert.alert("Bağlantı açılamadı", "NHS uyku rehberine şu anda ulaşılamıyor."))}><Text style={styles.linkText}>NHS · Bebeğinizin uyumasına yardımcı olma</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Getting-Your-Baby-to-Sleep.aspx").catch(() => Alert.alert("Bağlantı açılamadı", "AAP uyku rehberine şu anda ulaşılamıyor."))}><Text style={styles.linkText}>AAP · Bebeğinizi uyutmaya yardımcı olma</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.cdc.gov/sudden-infant-death/sleep-safely/").catch(() => Alert.alert("Bağlantı açılamadı", "CDC güvenli uyku rehberine şu anda ulaşılamıyor."))}><Text style={styles.linkText}>CDC · Güvenli uyku alanı</Text></Pressable>
        </View> : null}
      </Card>
      <Card tone="mint"><Text style={styles.eyebrow}>YAŞA UYGUN AŞAMA</Text><Text style={styles.heroSmall}>{stage.label}</Text><Text style={styles.body}>{stage.guidance}</Text></Card>
      <Card>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: wakeWindowGuideOpen }} onPress={() => setWakeWindowGuideOpen((open) => !open)} style={styles.nightGuideHeader}>
          <View style={styles.nightGuideHeaderText}><Text style={styles.cardTitle}>Yaşa göre uyanıklık aralıkları</Text><Text style={styles.body}>Bebeğiniz için rehber aralığı ve diğer yaş grupları</Text></View>
          <Text style={styles.nightGuideChevron}>{wakeWindowGuideOpen ? "−" : "+"}</Text>
        </Pressable>
        {wakeWindowGuideOpen ? <View style={styles.nightGuideContent}>
          {wakeWindows.map((window) => <View key={window.ageLabel} style={[styles.methodCompareRow, window.current && styles.currentWakeWindow]}><Text style={[styles.methodCompareLabel, window.current && styles.currentWakeWindowText]}>{window.ageLabel}{window.current ? " · bebeğiniz" : ""}</Text><Text style={[styles.methodCompareText, window.current && styles.currentWakeWindowText]}>{window.minMinutes}–{window.maxMinutes} dk</Text></View>)}
          <Text style={styles.hint}>Bunlar genel başlangıç aralıklarıdır; bebeğin uyku işaretleri ve kendi kayıtları önceliklidir. Erken doğan bebeklerde ilk 2 yıl düzeltilmiş yaş kullanılır. Kesin saat veya sağlık önerisi değildir.</Text>
        </View> : null}
      </Card>
      <Card>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: awakePatternOpen }} onPress={() => setAwakePatternOpen((open) => !open)} style={styles.nightGuideHeader}>
          <View style={styles.nightGuideHeaderText}><Text style={styles.cardTitle}>Bebeğinizin uyanıklık örüntüsü</Text><Text style={styles.body}>Son 30 gündeki tamamlanmış uyku kayıtları</Text></View>
          <Text style={styles.nightGuideChevron}>{awakePatternOpen ? "−" : "+"}</Text>
        </Pressable>
        {awakePatternOpen ? <View style={styles.nightGuideContent}>
          {awakeWindowInsights.map((insight) => <View key={insight.part} style={styles.awakeWindowRow}>
            <Text style={styles.awakeWindowLabel}>{insight.label}</Text>
            <Text style={styles.awakeWindowValue}>{insight.medianMinutes !== undefined ? `${insight.medianMinutes} dk medyan · ${insight.sampleCount} kayıt` : `${insight.sampleCount}/${insight.requiredSamples} kayıt · yaş rehberi kullanılıyor`}</Text>
          </View>)}
          <Text style={styles.hint}>Bu süreler birbirini izleyen tamamlanmış uyku kayıtlarından hesaplanır. Gündüz diliminde en az 5, gece diliminde en az 2 örnek olmadan kişisel medyan kullanılmaz. Aralıklar hedef veya kesin program değildir.</Text>
        </View> : null}
      </Card>
      {app.state.baby.gestationalWeek < 37 ? <Card tone="peach"><Text style={styles.cardTitle}>Erken doğum yaşı hesaba katılıyor</Text><Text style={styles.body}>Uyku penceresi ve koçluk aşaması, ilk iki yılda doğum haftasına göre düzeltilmiş yaşı kullanır. Aşı ve randevu tarihleri gerçek doğum tarihine bağlı kalır. Bu yaş bilgisi yalnızca genel rehber içindir; bebeğinizin bakım planını sağlık uzmanınızla belirleyin.</Text></Card> : null}
      <Card tone={coachingPausedToday ? "peach" : "white"}>
        <Text style={styles.cardTitle}>{todayCheckIn?.dayContext ? "Bugün uyku planı beklemede" : app.state.sleepPlan.paused ? "Uyku planı duraklatıldı" : "Planı istediğiniz zaman duraklatabilirsiniz"}</Text>
        <Text style={styles.body}>{todayCheckIn?.dayContext ? `${sleepDayContextLabel(todayCheckIn.dayContext)} seçildi. Bugün koçluk adımları tamamlanmaz ve plan günü ilerlemez. Uyku, beslenme ve bakım kayıtları sürer; olağan güne döndüğünüzde günlük rehbere devam edebilirsiniz.` : app.state.sleepPlan.paused ? "Koçluk adımları ve plan günü beklemede. Uyku, beslenme ve bakım kayıtlarınız normal şekilde devam eder." : "Hastalık, seyahat veya ailenizin ihtiyaçları değiştiğinde planı durdurup daha sonra kaldığınız günden sürdürebilirsiniz."}</Text>
        {!todayCheckIn?.dayContext ? <><View style={styles.spacer12} /><PrimaryButton label={app.state.sleepPlan.paused ? "Kaldığım yerden devam et" : "Uyku planını duraklat"} quiet={!app.state.sleepPlan.paused} onPress={app.toggleSleepPlanPaused} /></> : null}
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
        {methods.map((method) => <Pill key={method} label={methodDescription(method).name} active={coachingMethod === method} onPress={() => app.setMethod(method)} />)}
      </ScrollView>
      {trainingReady ? <><View style={styles.spacer12} /><PrimaryButton label="Uyku yaklaşımlarını karşılaştır" quiet onPress={() => setMethodGuideOpen(true)} /></> : null}
      {!trainingReady ? <Text style={styles.readinessNote}>{stage.canReduceSupport ? "Kademeli yaklaşım seçenekleri dört hazırlık maddesi tamamlandığında açılır. O zamana kadar duyarlı rutin gösterilir." : stage.guidance}</Text> : null}
      {trainingReady ? <>
        <SectionTitle title="Planın odağı" action="Günlük rehber kişiselleşir" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
          {sleepFocusOptions.map((item) => <Pill key={item.id} label={item.label} active={app.state.sleepPlan.focus === item.id} onPress={() => app.setSleepFocus(item.id)} />)}
        </ScrollView>
        <Text style={styles.readinessNote}>Odağı değiştirdiğinizde günün görev işaretleri temizlenir; böylece yeni adımları ayrı takip edebilirsiniz.</Text>
      </> : null}
      <Card tone="lavender">
        <Text style={styles.eyebrow}>{(coachingPausedToday ? "PLAN BEKLEMEDE · " : "") + plan.title.toUpperCase()}</Text>
        <Text style={styles.heroSmall}>{coachingPausedToday ? "Hazır olduğunuzda devam edin" : plan.focus}</Text>
        <Text style={styles.body}>{coachingPausedToday ? "Bu sırada günlük bakım kayıtlarını tutabilir, akşam rutininizi kullanabilirsiniz. Plan günü ilerlemez." : methodDescription(coachingMethod).support}</Text>
      </Card>
      <PrimaryButton label="Uyku planını bakım verenlerle paylaş" quiet onPress={sharePlan} />
      <SectionTitle title="Kayıtlarına göre gün taslağı" action="Son 14 gün" />
      <Card>
        {napOutline.length ? napOutline.map((nap) => <View key={nap.order} style={styles.eventRow}><View style={styles.flex}><Text style={styles.eventTitle}>{nap.order}. gündüz uykusu</Text><Text style={styles.muted}>{nap.actualStart ? `${nap.inProgress ? "Şu an uyuyor" : "Bugün kaydedildi"} · ${time(nap.actualStart)}` : `${time(nap.from)}–${time(nap.to)} · ortanca ${time(nap.typical)}`}</Text></View><Text style={styles.taskDate}>{nap.sampleCount} gün</Text></View>) : <Text style={styles.body}>Kişisel gündüz uykusu taslağı için son 14 günde en az üç farklı günde kayıt gerekir.</Text>}
        <Text style={styles.hint}>Bu aralıklar bebeğinizin önceki kayıtlarının özeti; bugünün kesin programı değildir. Uyku işaretleri ve sıradaki uyku penceresi önceliklidir.</Text>
      </Card>
      <SectionTitle title="Kestirme örüntüsü" action="İki haftayı karşılaştır" />
      <Card>
        {napPattern.available ? <>
          <View style={styles.measureRow}><Measure value={napPattern.recentMedian.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} label={`Son 7 gün · ${napPattern.recentLoggedDays} kayıtlı gün`} /><Measure value={napPattern.previousMedian.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} label={`Önceki 7 gün · ${napPattern.previousLoggedDays} kayıtlı gün`} /></View>
          <Text style={styles.body}>Kayıt bulunan günlerde gündüz uykusu sayısı {napPattern.trend === "fewer" ? "azalmış" : napPattern.trend === "more" ? "artmış" : "benzer"} görünüyor. {napPattern.trend === "fewer" ? "Bu değişiklik tek başına uyku geçişinin başladığını göstermez." : "Kısa süreli değişimler tek başına uyku geçişi anlamına gelmez."}</Text>
        </> : <Text style={styles.body}>İki haftayı karşılaştırmak için her haftada en az 4 farklı gündeki gündüz uykusunu kaydedin. Şu an kayıt olan günler: son hafta {napPattern.recentLoggedDays}, önceki hafta {napPattern.previousLoggedDays}.</Text>}
        <Text style={styles.hint}>Yalnızca kaydedilmiş 15 dakika–4 saatlik gündüz uykuları sayılır. Eksik kayıtlar örüntüyü değiştirebilir; bu bir geçiş tahmini değildir.</Text>
      </Card>
      <SectionTitle title="Kayıtlardan öneri" action={`${insights.nightsUsed} gece`} />
      <Card>
        <View style={styles.measureRow}><Measure value={insights.actualBedtime ?? "—"} label="Gerçek medyan" /><Measure value={insights.targetBedtime} label="Hedef" /><Measure value={insights.suggestedBedtime} label="Bu gece" /></View>
        <Text style={styles.body}>{insights.nightsUsed ? insights.adjustmentMinutes === 0 ? "Kayıtlı yatış saati hedefle uyumlu görünüyor." : `Hedefe doğru bu gece yalnızca ${Math.abs(insights.adjustmentMinutes)} dakikalık küçük bir değişim öneriliyor.` : "En az bir uzun gece uykusu kaydedildiğinde hedefle karşılaştırma yapılacak."}</Text>
        {insights.checkInAverage ? <Text style={styles.awake}>Son check-in ortalaması: {insights.checkInAverage.toFixed(1)}/5</Text> : null}
        {insights.nightWakingsAverage !== undefined ? <Text style={styles.awake}>Son değerlendirmelerde gece uyanma ortalaması: {insights.nightWakingsAverage.toFixed(1)}</Text> : null}
        {insights.sleepSupportSummary ? <Text style={styles.awake}>Son {insights.sleepSupportSamples} işaretli uyku kaydında geçiş desteği: {insights.sleepSupportSummary}</Text> : <Text style={styles.hint}>Uyku kayıtlarına geçiş desteği eklediğinizde son 7 işaretli kaydın dağılımı burada görünür.</Text>}
        {insights.routineToSleepMedianMinutes !== undefined ? <Text style={styles.awake}>Rutin bitişinden uyku başlangıcına ortanca {Math.round(insights.routineToSleepMedianMinutes)} dk · {insights.routineToSleepSamples} eşleşen gece</Text> : <Text style={styles.hint}>Rutin çalıştırıcısı tamamlanıp ardından gece uykusu kaydedildiğinde rutin–uyku aralığı burada görünür.</Text>}
      </Card>
      <SectionTitle title="Başlamadan önce" action={`${app.state.sleepPlan.readinessCompleted.length}/${SLEEP_READINESS_ITEMS.length}`} />
      <Card>
        {SLEEP_READINESS_ITEMS.map((item) => {
          const done = app.state.sleepPlan.readinessCompleted.includes(item);
          return <Pressable key={item} accessibilityRole="checkbox" accessibilityLabel={item} accessibilityState={{ checked: done }} onPress={() => app.toggleReadiness(item)} style={styles.taskRow}><View style={[styles.checkbox, done && styles.checkboxDone]}><Text style={styles.check}>{done ? "✓" : ""}</Text></View><Text style={styles.taskText}>{item}</Text></Pressable>;
        })}
        {!stage.canReduceSupport ? <Text style={styles.readinessNote}>Bu yaş aşamasında tüm maddeler tamamlansa bile desteği azaltma hedefi yoktur; rutin ve duyarlı bakım önceliklidir.</Text> : null}
      </Card>
      <SectionTitle title="Bugünün adımları" action={alreadyAdvancedToday ? "Yarın devam" : `${completedTodayCount}/${plan.tasks.length}`} />
      <Card>
        {plan.tasks.map((task) => {
          const done = app.state.sleepPlan.completedToday.includes(task);
          return (
            <Pressable key={task} accessibilityRole="checkbox" accessibilityLabel={task} accessibilityState={{ checked: done, disabled: coachingPausedToday || alreadyAdvancedToday || programCompleted }} disabled={coachingPausedToday || alreadyAdvancedToday || programCompleted} onPress={() => app.toggleTask(task)} style={[styles.taskRow, (coachingPausedToday || alreadyAdvancedToday || programCompleted) && styles.pausedTask]}>
              <View style={[styles.checkbox, done && styles.checkboxDone]}><Text style={styles.check}>{done ? "✓" : ""}</Text></View>
              <Text style={[styles.taskText, done && styles.taskTextDone]}>{task}</Text>
            </Pressable>
          );
        })}
      </Card>
      {app.state.sleepPlan.completedDays.length ? <>
        <SectionTitle title="14 günlük plan geçmişi" action={`${app.state.sleepPlan.completedDays.length} gün`} />
        <Card>
          {app.state.sleepPlan.completedDays.slice(-7).reverse().map((record) => <View key={`${record.date}-${record.day}`} style={styles.growthHistoryRow}>
            <View style={styles.eventRow}>
              <View style={styles.flex}>
                <Text style={styles.eventTitle}>{record.day}. gün · {record.completedTasks}/{record.totalTasks} görev</Text>
                <Text style={styles.muted}>{new Date(`${record.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} · {methodDescription(record.method).name}</Text>
              </View>
              <Text style={styles.taskDate}>{sleepFocusOptions.find((item) => item.id === record.focus)?.label ?? "Akşam rutini"}</Text>
            </View>
          </View>)}
          <Text style={styles.hint}>Bu geçmiş yalnızca plan gününü ilerlettiğinizde kaydedilir; gün atlamak tamamlanan görev sayısı anlamına gelmez.</Text>
        </Card>
      </> : null}
      {completedPlanRuns.length ? <>
        <SectionTitle title="Tamamlanan uyku programları" action={`${completedPlanRuns.length} döngü`} />
        <Card>
          {completedPlanRuns.slice().reverse().map((run) => {
            const completedTasks = run.days.reduce((sum, day) => sum + day.completedTasks, 0);
            const totalTasks = run.days.reduce((sum, day) => sum + day.totalTasks, 0);
            const firstMethod = run.days[0]?.method;
            return <View key={run.id} style={styles.growthHistoryRow}>
              <View style={styles.eventRow}>
                <View style={styles.flex}>
                  <Text style={styles.eventTitle}>{new Date(`${run.completedDate}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })} · {run.days.length}/14 gün</Text>
                  <Text style={styles.muted}>{firstMethod ? `Başlangıç yaklaşımı: ${methodDescription(firstMethod).name} · ` : ""}{completedTasks}/{totalTasks} günlük görev</Text>
                </View>
              </View>
            </View>;
          })}
          <Text style={styles.hint}>Özet, yalnızca ilerlettiğiniz plan günlerinden oluşur. Görev oranı bir uyku sonucu veya sağlık değerlendirmesi değildir.</Text>
        </Card>
      </> : null}
      {planCheckInComparison.available ? <>
        <SectionTitle title="Plan check-in karşılaştırması" action="İlk 3 · son 3 gün" />
        <Card tone="mint">
          {planCheckInComparison.firstEaseAverage !== undefined && planCheckInComparison.recentEaseAverage !== undefined ? <View style={styles.measureRow}>
            <Measure value={`${planCheckInComparison.firstEaseAverage.toFixed(1)}/5`} label={`İlk 3 gün · kolaylık (${planCheckInComparison.firstEaseCount} kayıt)`} />
            <Measure value={`${planCheckInComparison.recentEaseAverage.toFixed(1)}/5`} label={`Son 3 gün · kolaylık (${planCheckInComparison.recentEaseCount} kayıt)`} />
          </View> : <Text style={styles.body}>Kolaylık karşılaştırması için ilk ve son üç günde en az ikişer check-in kaydı gerekir.</Text>}
          {planCheckInComparison.firstWakingsAverage !== undefined && planCheckInComparison.recentWakingsAverage !== undefined ? <View style={styles.measureRow}>
            <Measure value={planCheckInComparison.firstWakingsAverage.toFixed(1)} label={`İlk 3 gün · uyanma (${planCheckInComparison.firstWakingsCount} kayıt)`} />
            <Measure value={planCheckInComparison.recentWakingsAverage.toFixed(1)} label={`Son 3 gün · uyanma (${planCheckInComparison.recentWakingsCount} kayıt)`} />
          </View> : null}
          <Text style={styles.hint}>Yalnızca aynı yaklaşım ve plandaki aynı odakla eşleşen günlerin check-in'leri gösterilir. “5+ uyanma” kayıtları ortalamaya dahil edilmez. Bu, kayıt karşılaştırmasıdır; sonuç veya sağlık değerlendirmesi değildir.</Text>
        </Card>
      </> : null}
      <SectionTitle title="Akşam rutini" action={`${app.state.sleepPlan.routine.reduce((sum, item) => sum + (item.enabled ? item.minutes : 0), 0)} dakika`} />
      <Card>
        <PrimaryButton label="Akşam rutinine başla" onPress={startRoutine} />
        <View style={styles.spacer12} />
        {app.state.sleepPlan.routine.map((item, index) => <View key={item.id} style={[styles.routineRow, !item.enabled && styles.routineDisabled]}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.enabled }} accessibilityLabel={`${item.label}, ${item.enabled ? "etkin" : "devre dışı"}; silmek için basılı tutun`} onPress={() => app.toggleRoutineStep(item.id)} onLongPress={() => app.deleteRoutineStep(item.id)} style={styles.routineToggle}><View style={[styles.miniCheck, item.enabled && styles.checkboxDone]}><Text style={styles.check}>{item.enabled ? "✓" : ""}</Text></View><Text style={styles.routineNo}>{index + 1}</Text><Text style={styles.taskText}>{item.label}</Text><Text style={styles.muted}>{item.minutes} dk</Text></Pressable><View style={styles.routineControls}><Pressable accessibilityRole="button" accessibilityLabel={`${item.label} adımını yukarı taşı`} disabled={index === 0} onPress={() => app.moveRoutineStep(item.id, -1)} style={[styles.routineMove, index === 0 && styles.routineMoveDisabled]}><Text style={styles.routineMoveText}>↑</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${item.label} adımını aşağı taşı`} disabled={index === app.state.sleepPlan.routine.length - 1} onPress={() => app.moveRoutineStep(item.id, 1)} style={[styles.routineMove, index === app.state.sleepPlan.routine.length - 1 && styles.routineMoveDisabled]}><Text style={styles.routineMoveText}>↓</Text></Pressable></View></View>)}
        <Text style={styles.inputLabel}>Yeni rutin adımı</Text><TextInput accessibilityLabel="Yeni rutin adımı adı" value={routineLabel} onChangeText={setRoutineLabel} style={styles.input} placeholder="Örn. pijamaları giy" placeholderTextColor="#93A09C" /><View style={styles.inlineForm}><TextInput accessibilityLabel="Rutin adımının süresi, dakika" value={routineMinutes} onChangeText={setRoutineMinutes} style={[styles.compactInput, styles.minutesInput]} keyboardType="number-pad" /><Text style={styles.body}>dakika</Text><View style={styles.flex}><PrimaryButton label="Adım ekle" quiet onPress={addRoutine} /></View></View>
        <Text style={styles.hint}>Bir adımı etkinleştirmek için dokunun, sırayı oklarla değiştirin; silmek için adım adına basılı tutun.</Text>
      </Card>
      <SectionTitle title="Hedef saatler" />
      <Card><View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Yatış</Text><TextInput accessibilityLabel="Hedef yatış saati" value={bedtime} onChangeText={(value) => setBedtime(normalizeClockInput(value))} style={styles.compactInput} keyboardType="number-pad" maxLength={5} /></View><View style={styles.timeField}><Text style={styles.muted}>Sabah</Text><TextInput accessibilityLabel="Hedef sabah uyanış saati" value={wakeTime} onChangeText={(value) => setWakeTime(normalizeClockInput(value))} style={styles.compactInput} keyboardType="number-pad" maxLength={5} /></View></View><View style={styles.spacer12} /><PrimaryButton label="Hedef saatleri kaydet" quiet onPress={saveSchedule} /></Card>
      <Card tone="peach">
        <Text style={styles.cardTitle}>Sabah check-in</Text><Text style={styles.body}>{plan.checkIn}</Text>
        <Text style={styles.inputLabel}>Dün gece özeti</Text>
        <View style={styles.measureRow}>
          <Measure value={nightSummary.minutes ? `${Math.floor(nightSummary.minutes / 60)} sa ${nightSummary.minutes % 60} dk` : "—"} label="Kaydedilen uyku" />
          <Measure value={todayCheckIn?.nightWakings === undefined ? "—" : todayCheckIn.nightWakings === 5 ? "5+" : String(todayCheckIn.nightWakings)} label="Bildirilen uyanma" />
        </View>
        <Text style={styles.hint}>{nightSummary.minutes ? `${nightSummary.segments} uyku aralığı · ${nightSummary.hasExactWindow ? "girdiğiniz yatış ve uyanış saatleri" : "18:00–12:00 varsayılan gece aralığı"}. Eksik uyku kayıtları toplama dahil değildir.` : "Gece uykusu zamanlayıcı kayıtları burada toplanır; ölçülmeyen süre tahmin edilmez."}</Text>
        <Text style={styles.inputLabel}>Gece özeti · isteğe bağlı</Text>
        <View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Dün gece yatış</Text><TextInput accessibilityLabel="Dün gece yatış saati" value={nightBedtime} onChangeText={(value) => setNightBedtime(normalizeClockInput(value))} style={styles.compactInput} placeholder="20:30" keyboardType="number-pad" maxLength={5} /></View><View style={styles.timeField}><Text style={styles.muted}>Sabah uyanış</Text><TextInput accessibilityLabel="Sabah uyanış saati" accessibilityHint="Saati 0700 biçiminde yazın. Geçerli saat girildiğinde uyku penceresi hesaplanır." value={morningWake} onChangeText={updateCoachMorningWake} onBlur={() => { if (isValidClock(morningWakeClock)) setMorningWake(morningWakeClock); }} style={styles.compactInput} placeholder="0700" keyboardType="number-pad" maxLength={5} /></View></View>
        {coachMorningWakeInputError ? <Text accessibilityLiveRegion="polite" style={styles.inputError}>{coachMorningWakeInputError}</Text> : morningWake.length > 0 && morningWake.length < 3 ? <Text style={styles.hint}>Saati rakamlarla yazın (ör. 0700 = 07:00).</Text> : null}
        <SleepDayContextPicker selected={todayCheckIn?.dayContext} onSelect={(dayContext) => app.saveCheckIn({ ...todayCheckIn, date: today, dayContext })} />
        {morningWakeForecast ? <Text accessibilityLiveRegion="polite" style={morningWakeForecast.available && morningWakeForecast.start && morningWakeForecast.end ? styles.awake : styles.hint}>{morningWakeForecast.available && morningWakeForecast.start && morningWakeForecast.end ? `${morningWakeHasSleep ? "Son uykudan sonraki" : "Sabah uyanışına göre ilk"} uyku penceresi: ${time(morningWakeForecast.start)}–${time(morningWakeForecast.end)}. ${morningWakeForecast.explanation}` : morningWakeForecast.explanation}</Text> : null}
        {nightSpanMinutes ? <Text style={styles.hint}>Gece aralığı {Math.floor(nightSpanMinutes / 60)} sa {nightSpanMinutes % 60} dk · uyanık kalınan süre çıkarılmamıştır.</Text> : null}
        <View style={styles.spacer12} /><PrimaryButton label={todayCheckIn?.bedtime === (nightBedtime.trim() || undefined) && todayCheckIn?.wakeTime === (morningWake.trim() ? morningWakeClock : undefined) && Boolean(nightBedtime || morningWake) ? "Gece özeti kaydedildi" : "Gece özetini kaydet"} quiet onPress={saveNightSummary} />
        <Text style={styles.hint}>Uyku zamanlayıcısını kullanmadığınız bir gecede saatleri elle ekleyebilirsiniz. Bu kayıt uyku kaydı yerine geçmez; koç yalnızca yatış saatini örüntü hesabında kullanır.</Text>
        <Text style={styles.inputLabel}>Uykuya geçişin kolaylığı</Text>
        <View style={styles.easeRow}>{([1, 2, 3, 4, 5] as const).map((ease) => <Pressable accessibilityRole="button" accessibilityLabel={`Kolaylık ${ease}/5`} key={ease} onPress={() => app.saveCheckIn({ ...todayCheckIn, date: today, ease })} style={[styles.easeButton, todayCheckIn?.ease === ease && styles.easeButtonActive]}><Text style={[styles.easeText, todayCheckIn?.ease === ease && styles.easeTextActive]}>{ease}</Text></Pressable>)}</View>
        <Text style={styles.easeLabels}><Text>Zordu</Text><Text>                                      Kolaydı</Text></Text>
        <Text style={styles.inputLabel}>Gece uyanma sayısı</Text>
        <View style={styles.easeRow}>{([0, 1, 2, 3, 4, 5] as const).map((count) => <Pressable accessibilityRole="button" accessibilityLabel={count === 5 ? "5 veya daha fazla uyanma" : `${count} gece uyanması`} key={count} onPress={() => app.saveCheckIn({ ...todayCheckIn, date: today, nightWakings: count })} style={[styles.easeButton, todayCheckIn?.nightWakings === count && styles.easeButtonActive]}><Text style={[styles.easeText, todayCheckIn?.nightWakings === count && styles.easeTextActive]}>{count === 5 ? "5+" : count}</Text></Pressable>)}</View>
        <Text style={styles.hint}>Bildirilen toplam sayı ile saatli uyanma kayıtları ayrı tutulur; ikisi de isteğe bağlıdır.</Text>
        {todayCheckIn?.nightWakeLogs?.length ? <><Text style={styles.inputLabel}>Kaydedilen uyanmalar</Text>{todayCheckIn.nightWakeLogs.slice(-5).reverse().map((log) => <View key={log.id} style={styles.eventRow}><View style={styles.eventDot} /><View style={styles.flex}><Text style={styles.eventTitle}>{nightWakeResponseLabel(log.response)}</Text><Text style={styles.muted}>{log.caregiver}</Text></View><Text style={styles.taskDate}>{time(log.at)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${time(log.at)} uyanma kaydını sil`} onPress={() => confirmDeleteNightWake(log.id)} hitSlop={8}><Text style={styles.editLink}>Sil</Text></Pressable></View>)}{todayCheckIn.nightWakeLogs.length > 5 ? <Text style={styles.hint}>Son 5 kayıt gösteriliyor.</Text> : null}</> : <Text style={styles.hint}>Bugün henüz saatli gece uyanması kaydı yok. Bugün ekranındaki Uyanma kısayolundan ekleyebilirsiniz.</Text>}
        <Text style={styles.inputLabel}>Dünden farklı olan neydi? (isteğe bağlı)</Text>
        <TextInput accessibilityLabel="Bugünkü uyku ve rutin hakkında not" value={todayCheckIn?.note ?? ""} onChangeText={(note) => app.saveCheckIn({ ...todayCheckIn, date: today, note })} style={[styles.input, { minHeight: 88, textAlignVertical: "top" }]} multiline maxLength={300} placeholder="Örn. misafir, yolculuk veya farklı bir rutin" placeholderTextColor="#93A09C" />
        <Text style={styles.hint}>Bu not yalnızca cihazınızda saklanır ve doktor özetindeki check-in kayıtlarına eklenmez.</Text>
      </Card>
      <SectionTitle title="Son geceler" action="7 günlük görünüm" />
      <Card>
        {recentNightSummaries.length ? recentNightSummaries.map(({ checkIn, summary }) => <View key={checkIn.date} style={styles.eventRow}>
          <View style={styles.flex}><Text style={styles.eventTitle}>{new Date(`${checkIn.date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" })}</Text><Text style={styles.muted}>{summary.minutes ? `${Math.floor(summary.minutes / 60)} sa ${summary.minutes % 60} dk kaydedilen uyku` : "Uyku süresi kaydedilmemiş"}</Text></View>
          <Text style={styles.taskDate}>{checkIn.nightWakings === undefined ? "Uyanma —" : `Uyanma ${checkIn.nightWakings === 5 ? "5+" : checkIn.nightWakings}`}</Text>
        </View>) : <Text style={styles.body}>Gece özeti veya uyanma sayısı eklendikçe son yedi gün burada görünür.</Text>}
        <Text style={styles.hint}>Uyku süreleri yalnızca uygulamaya kaydedilmiş uyku aralıklarının toplamıdır.</Text>
      </Card>
      {coachingPausedToday ? <Text style={styles.pausedMessage}>{todayCheckIn?.dayContext ? "Bugünün bağlamı nedeniyle koçluk planı ilerlemiyor. Olağan güne döndüğünüzde devam edebilirsiniz." : "Planı sürdürdüğünüzde gün adımları yeniden etkinleşir."}</Text> : programCompleted ? <Text style={styles.pausedMessage}>14 günlük plan tamamlandı.</Text> : alreadyAdvancedToday ? <Text style={styles.pausedMessage}>Bu günün adımını tamamladınız. Sıradaki gün yarın açılacak.</Text> : <PrimaryButton label={app.state.sleepPlan.day >= 14 ? "14. günü tamamla" : "Günü tamamla"} onPress={() => app.advancePlan(completedTodayCount, plan.tasks.length, coachingMethod)} />}
      <Text style={styles.disclaimer}>Yoğun ağlama, beslenme güçlüğü, solunum sorunu veya sağlık endişesinde planı durdurun ve sağlık uzmanınıza danışın.</Text>
      <BedtimeRoutineModal visible={routineRunnerOpen} steps={app.state.sleepPlan.routine.filter((item) => item.enabled)} close={() => setRoutineRunnerOpen(false)} addEvent={app.addEvent} />
      <SleepMethodsModal visible={methodGuideOpen} close={() => setMethodGuideOpen(false)} methods={methods} activeMethod={coachingMethod} choose={(method) => app.setMethod(method)} />
    </ScrollView>
  );
}

function SleepMethodsModal({ visible, close, methods, activeMethod, choose }: { visible: boolean; close: () => void; methods: SleepMethod[]; activeMethod: SleepMethod; choose: (method: SleepMethod) => void }) {
  const [preference, setPreference] = useState<"all" | "near" | "reduce" | "checks">("all");
  if (!visible) return null;
  const preferenceMethods: Record<Exclude<typeof preference, "all">, SleepMethod[]> = {
    near: ["responsive", "camping", "pickUpPutDown", "routineFirst"],
    reduce: ["gradual", "camping", "bedtimeFading"],
    checks: ["timedChecks"]
  };
  const matches = preference === "all" ? methods : methods.filter((method) => preferenceMethods[preference].includes(method));
  const otherMethods = preference === "all" ? [] : methods.filter((method) => !matches.includes(method));
  const methodCard = (method: SleepMethod) => <Pressable key={method} accessibilityRole="button" accessibilityLabel={`${methodDescription(method).name} yaklaşımını seç`} onPress={() => { choose(method); close(); }}><Card tone={method === activeMethod ? "mint" : "white"}><Text style={styles.cardTitle}>{methodDescription(method).name}{method === activeMethod ? " · seçili" : ""}</Text><Text style={styles.body}>{methodDescription(method).support}</Text><Text style={styles.inputLabel}>Bakım veren ne yapar?</Text><Text style={styles.body}>{methodDescription(method).caregiverRole}</Text><Text style={styles.inputLabel}>Gece uyanınca</Text><Text style={styles.body}>{methodDescription(method).nightResponse}</Text><View style={styles.methodCompare}>{([["Huzursuzluk", methodDescription(method).comparison.protest], ["Bakım veren", methodDescription(method).comparison.presence], ["Uygulama yükü", methodDescription(method).comparison.effort], ["İlerleme", methodDescription(method).comparison.pace]] as const).map(([label, value]) => <View key={label} style={styles.methodCompareRow}><Text style={styles.methodCompareLabel}>{label}</Text><Text style={styles.methodCompareText}>{value}</Text></View>)}</View><Text style={styles.hint}>Bebek belirgin biçimde huzursuzsa, hastaysa veya beslenme/sağlık kaygısı varsa denemeyi bırakıp ihtiyacına yanıt verin.</Text></Card></Pressable>;
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} contentContainerStyle={styles.contentInset} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Uyku yaklaşımlarını karşılaştır</Text><Text style={styles.pageIntro}>Ölçütler yöntemleri konuşmayı kolaylaştıran genel bir karşılaştırmadır; bebeğinizin tepkisi ve gereken süre değişebilir. Bir yaklaşım seçmek zorunlu değildir, istediğiniz zaman duraklatabilirsiniz.</Text>
    <Text style={styles.inputLabel}>Ailenizin tercihine göre görünümü daraltın</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}><Pill label="Tümü" active={preference === "all"} onPress={() => setPreference("all")} /><Pill label="Yakınında kal" active={preference === "near"} onPress={() => setPreference("near")} /><Pill label="Desteği azalt" active={preference === "reduce"} onPress={() => setPreference("reduce")} /><Pill label="Kısa kontroller" active={preference === "checks"} onPress={() => setPreference("checks")} /></ScrollView><Text style={styles.hint}>Bu filtre yalnızca yöntemleri aile tercihinize göre gruplar; öneri veya sıralama değildir. Diğer yöntemler de aşağıda kalır.</Text>
    {preference !== "all" ? <Text style={styles.inputLabel}>Tercihinizle örtüşen yöntemler</Text> : null}{matches.map(methodCard)}{otherMethods.length ? <><Text style={styles.inputLabel}>Diğer yaklaşımlar</Text>{otherMethods.map(methodCard)}</> : null}
    <Card tone="peach"><Text style={styles.body}>Bu seçenekler genel bilgilendirmedir; her bebeğe uyan tek bir yöntem yoktur. Beslenme ihtiyacını ertelemeyin. Sağlık veya gelişim kaygısında çocuk doktorunuzla konuşun.</Text></Card><PrimaryButton label="Kapat" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function BedtimeRoutineModal({ visible, steps, close, addEvent }: { visible: boolean; steps: RoutineStep[]; close: () => void; addEvent: ReturnType<typeof useUykuvaState>["addEvent"] }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setCompletedIds([]);
    setStartedAt(new Date().toISOString());
  }, [visible]);
  if (!visible) return null;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const finish = (finishedIds: string[]) => {
    const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000)) : 0;
    addEvent({ kind: "note", note: `Akşam rutini tamamlandı · ${finishedIds.length}/${steps.length} adım · ${elapsed} dk`, startedAt: startedAt || new Date().toISOString(), endedAt: new Date().toISOString() });
    Alert.alert("Rutin kaydedildi", `${finishedIds.length}/${steps.length} adım tamamlandı. Kayıt zaman çizelgenize eklendi.`);
    close();
  };
  const advance = (markDone: boolean) => {
    const nextCompleted = markDone && step && !completedIds.includes(step.id) ? [...completedIds, step.id] : completedIds;
    if (stepIndex >= steps.length - 1) return finish(nextCompleted);
    setCompletedIds(nextCompleted);
    setStepIndex((current) => current + 1);
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><View style={[styles.sheet, styles.quickSheet]}>
    <View style={styles.sheetHandle} /><Text style={styles.eyebrow}>AKŞAM RUTİNİ</Text>
    <Text style={styles.pageTitle}>{step ? `${stepIndex + 1}. adım` : "Rutin adımı kalmadı"}</Text>
    {step ? <>
      <Text style={styles.heroSmall}>{step.label}</Text>
      <Text style={styles.body}>Bu adım için yaklaşık {step.minutes} dakika ayırabilirsiniz. Süre bir hedef değil, planlama kolaylığıdır.</Text>
      <View style={styles.spacer12} /><Text style={styles.muted}>Adım {stepIndex + 1} / {steps.length} · {completedIds.length} tamamlandı</Text>
      <View style={styles.spacer24} />
      <PrimaryButton label={stepIndex === steps.length - 1 ? "Adımı tamamla ve bitir" : "Adımı tamamla · sonraki"} onPress={() => advance(true)} />
      {stepIndex < steps.length - 1 ? <><View style={styles.spacer12} /><PrimaryButton label="Bu adımı atla" quiet onPress={() => advance(false)} /></> : null}
    </> : <Text style={styles.body}>Etkin akşam rutini adımı bulunamadı.</Text>}
    <View style={styles.spacer12} /><PrimaryButton label="Rutini kapat" quiet onPress={close} />
  </View></Modal>;
}

async function shareDoctorPdf(state: ReturnType<typeof useUykuvaState>["state"]) {
  try {
    const file = await Print.printToFileAsync({ html: createDoctorSummaryHtml(state), base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return Alert.alert("Paylaşım kullanılamıyor", "PDF hazırlandı ancak bu cihazda paylaşım menüsü açılamadı.");
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Uykuva doktor özetini paylaş" });
  } catch {
    Alert.alert("PDF oluşturulamadı", "Doktor özeti PDF olarak hazırlanırken bir sorun oluştu. Metin özeti paylaşımını kullanabilirsiniz.");
  }
}

function InsightsScreen({ app, openTask, openEditTask, openVaccineSuggestions, now }: { app: ReturnType<typeof useUykuvaState>; openTask: (mode: TaskMode) => void; openEditTask: (task: CareTask) => void; openVaccineSuggestions: () => void; now: Date }) {
  const state = app.state;
  const events = state.events;
  const newbornSummary = correctedAgeDays(state.baby, now) < 63;
  const periodStart = new Date(now);
  if (newbornSummary) periodStart.setTime(now.getTime() - 24 * 60 * 60 * 1000);
  else periodStart.setHours(0, 0, 0, 0);
  const recent = events.filter((event) => new Date(event.startedAt).getTime() >= periodStart.getTime() && new Date(event.startedAt).getTime() <= now.getTime());
  const periodEnd = now.getTime();
  const sleeps = events.filter((event) => event.kind === "sleep" && new Date(event.startedAt).getTime() < periodEnd && (event.endedAt ? new Date(event.endedAt).getTime() : periodEnd) > periodStart.getTime());
  const sleepMinutes = sleeps.reduce((sum, event) => {
    const start = Math.max(new Date(event.startedAt).getTime(), periodStart.getTime());
    const end = Math.min(event.endedAt ? new Date(event.endedAt).getTime() : periodEnd, periodEnd);
    return sum + Math.max(0, end - start) / 60_000;
  }, 0);
  const feeds = recent.filter((event) => event.kind === "feed" && event.feedType !== "pump");
  const feedingTotals = todayFeedingTotals(events, now, newbornSummary);
  const diapers = recent.filter((event) => event.kind === "diaper");
  const health = recent.filter((event) => event.kind === "health");
  const weeklySleep = weeklySleepTotals(events);
  const weeklyDiapers = weeklyDiaperTotals(events, now);
  const maxDailyDiapers = Math.max(0, ...weeklyDiapers.map((day) => day.total));
  const maxDailySleep = Math.max(0, ...weeklySleep.map((day) => day.totalMinutes));
  const recordedSleepDays = weeklySleep.filter((day) => day.sleepCount > 0);
  const averageWeeklySleep = recordedSleepDays.length ? Math.round(recordedSleepDays.reduce((sum, day) => sum + day.totalMinutes, 0) / recordedSleepDays.length) : 0;
  const growthMeasurements = events.filter((event) => event.kind === "growth").sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const milestones = detectRecordedMilestones(events, now);
  const solidHistory = summarizeSolidFoodHistory(events);
  const upcoming = [...state.careTasks].filter((task) => !task.completedAt).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const completedCareTasks = [...state.careTasks].filter((task) => task.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>{newbornSummary ? "Son 24 saatin özeti" : "Günlük özet"}</Text><Text style={styles.pageIntro}>Rakamları yorumlamak için değil, değişimi fark etmek için.</Text>
      <View style={styles.statGrid}>
        <Stat value={`${Math.floor(sleepMinutes / 60)}s ${Math.round(sleepMinutes % 60)}d`} label={newbornSummary ? "Uyku · son 24 sa" : "Toplam uyku"} tone="mint" />
        <Stat value={`${feeds.length}`} label="Beslenme" tone="peach" />
        <Stat value={`${diapers.length}`} label="Bez" tone="lavender" />
        <Stat value={`${health.length}`} label="Sağlık kaydı" tone="white" />
      </View>
      <SectionTitle title="Son 7 gün · uyku süreleri" action={recordedSleepDays.length ? `Kayıtlı gün ort. ${Math.floor(averageWeeklySleep / 60)} sa ${averageWeeklySleep % 60} dk` : "Kayıt yok"} />
      <Card>
        {maxDailySleep ? <View style={styles.weeklyChart}>{weeklySleep.map((day) => {
          const hours = Math.floor(day.totalMinutes / 60);
          const minutes = day.totalMinutes % 60;
          return <View key={day.date} style={styles.weeklyColumn} accessibilityLabel={day.sleepCount ? `${day.label}: ${hours} saat ${minutes} dakika uyku, ${day.sleepCount} dönem` : `${day.label}: uyku kaydı yok`}><View style={styles.weeklyTrack}><View style={[styles.weeklyBar, { height: day.totalMinutes ? `${Math.max(3, day.totalMinutes / maxDailySleep * 100)}%` : "0%" }]} /></View><Text style={styles.weeklyValue}>{day.sleepCount ? hours ? `${hours}s` : `${minutes}d` : "—"}</Text><Text style={styles.weeklyLabel}>{day.label}</Text></View>;
        })}</View> : <Text style={styles.body}>Grafik oluşturmak için uyku başlangıç ve bitiş kayıtları ekleyin.</Text>}
        <Text style={styles.hint}>Gün sınırını aşan uyku dönemleri iki güne süreleri oranında dağıtılır. Görsel yalnızca girilen kayıtları gösterir.</Text>
      </Card>
      <SectionTitle title="Son 7 gün · bez kayıtları" action={maxDailyDiapers ? `${weeklyDiapers.reduce((sum, day) => sum + day.total, 0)} kayıt` : "Kayıt yok"} />
      <Card>
        {maxDailyDiapers ? <>
          <View style={styles.diaperLegend}>
            <View style={styles.diaperLegendItem}><View style={[styles.diaperLegendDot, styles.diaperWet]} /><Text style={styles.muted}>Islak</Text></View>
            <View style={styles.diaperLegendItem}><View style={[styles.diaperLegendDot, styles.diaperDirty]} /><Text style={styles.muted}>Kirli</Text></View>
            <View style={styles.diaperLegendItem}><View style={[styles.diaperLegendDot, styles.diaperMixed]} /><Text style={styles.muted}>İkisi</Text></View>
          </View>
          {weeklyDiapers.map((day) => <View key={day.date} style={styles.diaperTrendRow} accessibilityLabel={`${day.label}: ${day.wet} ıslak, ${day.dirty} kirli, ${day.mixed} ikisi, toplam ${day.total} bez kaydı`}>
            <Text style={styles.diaperTrendLabel}>{day.label}</Text>
            <View style={styles.diaperTrendTrack}>
              {day.wet ? <View style={[styles.diaperSegment, styles.diaperWet, { flex: day.wet / maxDailyDiapers }]} /> : null}
              {day.dirty ? <View style={[styles.diaperSegment, styles.diaperDirty, { flex: day.dirty / maxDailyDiapers }]} /> : null}
              {day.mixed ? <View style={[styles.diaperSegment, styles.diaperMixed, { flex: day.mixed / maxDailyDiapers }]} /> : null}
              {day.total < maxDailyDiapers ? <View style={{ flex: (maxDailyDiapers - day.total) / maxDailyDiapers }} /> : null}
            </View>
            <Text style={styles.diaperTrendCount}>{day.total || "—"}</Text>
          </View>)}
        </> : <Text style={styles.body}>Günlük bez değişimlerini ekledikçe son yedi gün burada görünür.</Text>}
        <Text style={styles.hint}>Çubuklar kaydedilen ıslak, kirli ve ikili bez sayılarını gösterir. Kayıt eksik olabilir; bu grafik sağlık değerlendirmesi değildir.</Text>
      </Card>
      <SectionTitle title={newbornSummary ? "Son 24 saatte beslenme" : "Bugünkü beslenme"} />
      <Card tone="peach"><View style={styles.measureRow}><Measure value={`${feedingTotals.breastMinutes} dk`} label="Emzirme" /><Measure value={`${feedingTotals.bottleMl} ml`} label="Biberon" /><Measure value={`${feedingTotals.solids}`} label="Katı öğün" /></View><Text style={styles.body}>Toplam {feedingTotals.count} beslenme kaydı. Değerler yalnızca girilen kayıtlardan hesaplanır.</Text></Card>
      <SectionTitle title="Ek gıda günlüğü" action={`${solidHistory.mealCount} öğün`} />
      <Card>
        {solidHistory.foods.length || solidHistory.allergens.length ? <>
          {solidHistory.foods.length ? <>
            <Text style={styles.inputLabel}>Kaydedilen yiyecekler</Text>
            {solidHistory.foods.slice(0, 8).map((food) => <View key={food.name.toLocaleLowerCase("tr-TR")} style={styles.eventRow}>
              <View style={styles.flex}><Text style={styles.eventTitle}>{food.name}</Text><Text style={styles.muted}>İlk uygulama kaydı · {new Date(food.firstRecordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</Text></View>
              <Text style={styles.taskDate}>{food.mealCount} öğün</Text>
            </View>)}
            {solidHistory.foods.length > 8 ? <Text style={styles.hint}>Diğer yiyecek kayıtları Akış sekmesinde bulunabilir.</Text> : null}
          </> : null}
          {solidHistory.allergens.length ? <>
            <Text style={styles.inputLabel}>Öğünlere eklenen alerjen etiketleri</Text>
            <Text style={styles.body}>{solidHistory.allergens.map((item) => `${item.name} (${item.taggedMealCount})`).join(" · ")}</Text>
          </> : null}
          {solidHistory.observations.length ? <>
            <Text style={styles.inputLabel}>Yazılı tepki gözlemleri</Text>
            {solidHistory.observations.map((item) => <View key={`${item.startedAt}-${item.note}`} style={styles.growthHistoryRow}>
              <Text style={styles.muted}>{new Date(item.startedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}{item.foods.length ? ` · ${item.foods.join(", ")}` : ""}</Text>
              <Text style={styles.body}>{item.note}</Text>
              {item.allergens.length ? <Text style={styles.hint}>Öğün etiketleri: {item.allergens.join(", ")}</Text> : null}
            </View>)}
          </> : null}
        </> : <Text style={styles.body}>Katı gıda öğünleri kaydedildikçe yiyecek ve etiket geçmişi burada görünür.</Text>}
        <Text style={styles.hint}>Bu bölüm yalnızca kaydedilen öğünleri ve ebeveyn gözlemlerini listeler; alerji tanısı, güvenli gıda önerisi veya tepki değerlendirmesi sunmaz.</Text>
      </Card>
      <MilkStockCard events={events} now={now} update={app.updateEvent} />
      <GrowthHistoryCard measurements={growthMeasurements} baby={app.state.baby} />
      <DevelopmentTrackerCard app={app} now={now} />
      <SectionTitle title="Kayıtlardan anılar" action="İsteğe bağlı" />
      <Card>
        {milestones.length ? milestones.slice(0, 8).map((milestone) => <View key={milestone.id} style={styles.eventRow}>
          <View style={styles.flex}>
            <Text style={styles.eventTitle}>{milestone.title}</Text>
            <Text style={styles.muted}>{new Date(milestone.occurredAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })} · {milestone.detail}</Text>
          </View>
          {milestone.saved ? <Text style={styles.taskDate}>Anılarda</Text> : <PrimaryButton label="Anılara ekle" quiet onPress={() => app.addEvent({ kind: "memory", memoryTitle: milestone.title, note: `${milestone.detail} Bu an, uygulamada kayıtlı etkinliklerden bulundu.`, milestoneId: milestone.id, startedAt: milestone.occurredAt })} />}
        </View>) : <Text style={styles.body}>Uyku, beslenme veya ölçüm kaydı ekledikçe burada kayıtlara dayalı anlar görünür.</Text>}
        <Text style={styles.hint}>Bunlar yalnızca uygulamadaki kayıtlardan çıkarılır; gelişim basamağı veya sağlık değerlendirmesi değildir. Anı eklemek isteğe bağlıdır.</Text>
      </Card>
      <SectionTitle title="Aşı ve randevular" action={`${upcoming.length} yaklaşan`} />
      <View style={styles.dualButtons}><View style={styles.dualButton}><PrimaryButton label="Aşı ekle" quiet onPress={() => openTask("vaccine")} /></View><View style={styles.dualButton}><PrimaryButton label="Randevu ekle" quiet onPress={() => openTask("appointment")} /></View></View>
      <PrimaryButton label="Ulusal takvimden aşı önerileri" quiet onPress={openVaccineSuggestions} />
      {upcoming.length ? <Card>{upcoming.slice(0, 6).map((task) => <CareTaskRow key={task.id} task={task} onToggle={() => app.toggleCareTask(task.id)} onDelete={() => app.deleteCareTask(task.id)} onEdit={() => openEditTask(task)} />)}</Card> : <Card><Text style={styles.body}>Yaklaşan aşı veya doktor randevusu eklenmedi.</Text></Card>}
      {completedCareTasks.length ? <><SectionTitle title="Tamamlanan aşı ve randevular" action={`${completedCareTasks.length} kayıt`} /><Card>{completedCareTasks.map((task) => <CareTaskRow key={task.id} task={task} onToggle={() => app.toggleCareTask(task.id)} onDelete={() => app.deleteCareTask(task.id)} onEdit={() => openEditTask(task)} />)}<Text style={styles.hint}>Düzenle ile tarih veya notu değiştirin; kayda dokunarak yeniden açabilir, basılı tutarak silebilirsiniz.</Text></Card></> : null}
      <SectionTitle title="Doktor görüşmesi" />
      <Card><Text style={styles.cardTitle}>Kısa ve düzenli bir özet</Text><Text style={styles.body}>Son yedi günün uyku, beslenme, bez, sağlık ve büyüme kayıtlarını tarafsız bir metinde toplayın.</Text><View style={styles.spacer12} /><View style={styles.dualButtons}><View style={styles.dualButton}><PrimaryButton label="PDF hazırla" onPress={() => void shareDoctorPdf(state)} /></View><View style={styles.dualButton}><PrimaryButton label="Metni paylaş" quiet onPress={() => void Share.share({ message: createDoctorSummary(state) })} /></View></View></Card>
    </ScrollView>
  );
}

function DevelopmentTrackerCard({ app, now }: { app: ReturnType<typeof useUykuvaState>; now: Date }) {
  const ageMonths = correctedAgeMonths(app.state.baby, now);
  const currentCheckpoint = developmentCheckpointForAge(ageMonths);
  const [selectedAge, setSelectedAge] = useState<number | null>(currentCheckpoint?.ageMonths ?? null);
  useEffect(() => setSelectedAge(currentCheckpoint?.ageMonths ?? null), [app.state.baby.id, currentCheckpoint?.ageMonths]);
  const checkpoint = DEVELOPMENT_CHECKPOINTS.find((item) => item.ageMonths === selectedAge && item.ageMonths <= ageMonths) ?? currentCheckpoint;
  const checkIn = checkpoint ? app.state.developmentCheckIns?.find((item) => item.ageMonths === checkpoint.ageMonths) : undefined;
  const [note, setNote] = useState(checkIn?.note ?? "");
  useEffect(() => setNote(checkIn?.note ?? ""), [checkpoint?.ageMonths, checkIn?.checkedAt]);

  if (!checkpoint) return <>
    <SectionTitle title="Yaşa göre gelişim gözlemi" action="2 ayda açılır" />
    <Card><Text style={styles.body}>CDC yaş listeleri 2. aydan başlar. Düzeltilmiş yaşı iki aydan küçük bebeklerde burada liste gösterilmez.</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.cdc.gov/act-early/milestones/")}><Text style={styles.linkText}>CDC gelişim kaynaklarını aç</Text></Pressable></Card>
  </>;

  const items = checkpoint.groups.flatMap((item) => item.items);
  const answers = checkIn?.answers ?? {};
  const counts = {
    yes: items.filter((item) => answers[item.id] === "yes").length,
    notSure: items.filter((item) => answers[item.id] === "notSure").length,
    notYet: items.filter((item) => answers[item.id] === "notYet").length
  };
  const options = [{ id: "yes" as const, label: "Gözlemledim" }, { id: "notSure" as const, label: "Emin değilim" }, { id: "notYet" as const, label: "Henüz görmedim" }];
  return <>
    <SectionTitle title="Yaşa göre gelişim gözlemi" action={checkpoint.title} />
    <Card>
      {DEVELOPMENT_CHECKPOINTS.filter((item) => item.ageMonths <= ageMonths).length > 1 ? <>
        <Text style={styles.inputLabel}>Gözden geçirilecek yaş listesi</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills} contentContainerStyle={{ flexDirection: "row", gap: 8 }}>
          {DEVELOPMENT_CHECKPOINTS.filter((item) => item.ageMonths <= ageMonths).map((item) => <Pill key={item.ageMonths} label={item.title} active={checkpoint.ageMonths === item.ageMonths} onPress={() => setSelectedAge(item.ageMonths)} />)}
        </ScrollView>
      </> : null}
      <Text style={styles.body}>Düzeltilmiş yaşa göre {checkpoint.title} listesi · CDC yaş kontrol listesinden uyarlanmıştır.</Text>
      <Text style={styles.hint}>Liste, çoğu çocuğun bu yaşa kadar yapabildiği becerileri gözlemlemek içindir; gelişim taraması veya tanı değildir. Yaş listeleri arasındaysanız önceki yaş listesini kullanın.</Text>
      {checkIn ? <Text style={styles.awake}>Son kayıt: {new Date(checkIn.checkedAt).toLocaleDateString("tr-TR")} · {counts.yes} gözlemledim · {counts.notSure} emin değilim · {counts.notYet} henüz görmedim</Text> : <Text style={styles.muted}>Bu yaş için henüz gözlem kaydı yok.</Text>}
      {checkpoint.groups.map((milestoneGroup) => <View key={milestoneGroup.domain}>
        <Text style={styles.inputLabel}>{milestoneGroup.label}</Text>
        {milestoneGroup.items.map((item) => <View key={item.id} style={styles.developmentItem}>
          <Text style={styles.body}>{item.label}</Text>
          <View style={styles.developmentOptions}>{options.map((option) => <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={`${item.label}: ${option.label}`} accessibilityState={{ selected: answers[item.id] === option.id }} onPress={() => app.saveDevelopmentAnswer(checkpoint.ageMonths, item.id, option.id)} style={[styles.developmentOption, answers[item.id] === option.id && styles.developmentOptionActive]}><Text style={[styles.developmentOptionText, answers[item.id] === option.id && styles.developmentOptionTextActive]}>{option.label}</Text></Pressable>)}</View>
        </View>)}
      </View>)}
      <Text style={styles.inputLabel}>Doktora veya diğer bakım verene sorularım</Text>
      <TextInput accessibilityLabel="Gelişim gözlemleri hakkında doktora veya bakıcıya not" value={note} onChangeText={setNote} style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} multiline maxLength={500} placeholder="İsterseniz merak ettiğiniz noktaları not edin." placeholderTextColor="#93A09C" />
      <PrimaryButton label="Gelişim notunu kaydet" quiet onPress={() => app.saveDevelopmentNote(checkpoint.ageMonths, note)} />
      <Text style={styles.hint}>“Henüz görmedim” veya “Emin değilim” yanıtlarını, beceri kaybını ya da başka bir endişeyi çocuk doktorunuzla paylaşın. Bu gözlemler doktor özeti paylaşımına eklenir.</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(checkpoint.sourceUrl)}><Text style={styles.linkText}>CDC {checkpoint.title} kaynak listesini aç</Text></Pressable>
    </Card>
  </>;
}

function CareTaskRow({ task, onToggle, onDelete, onEdit }: { task: CareTask; onToggle: () => void; onDelete: () => void; onEdit?: () => void }) {
  const taskType = task.type === "vaccine" ? "Aşı" : "Randevu";
  const taskDate = new Date(task.dueAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : undefined;
  const confirmDelete = () => Alert.alert("Kaydı sil?", `${task.title} ${taskType.toLocaleLowerCase("tr-TR")} kaydı kalıcı olarak silinecek.`, [
    { text: "Vazgeç", style: "cancel" },
    { text: "Sil", style: "destructive", onPress: onDelete }
  ]);
  return <View style={styles.eventRow}><View style={[styles.eventDot, { backgroundColor: task.type === "vaccine" ? colors.peach : colors.lavender }]} /><Pressable accessibilityRole="button" accessibilityLabel={`${task.title}, ${taskType}${task.repeat ? `, ${task.repeat === "weekly" ? "haftalık" : "aylık"} tekrarlı` : ""}, ${task.completedAt ? `uygulamada tamamlandı ${completedDate}; yeniden aç` : `${taskDate}; tamamla`}. Silmek için basılı tutun ve onaylayın.`} onPress={onToggle} onLongPress={confirmDelete} style={styles.flex}><Text style={styles.eventTitle}>{task.title}</Text><Text style={styles.muted}>{taskType}{task.repeat ? ` · ${task.repeat === "weekly" ? "Haftalık" : "Aylık"} tekrar` : ""} · {task.completedAt ? `uygulamada tamamlandı ${completedDate} · dokununca yeniden aç` : "dokununca tamamla"}</Text>{task.note ? <Text style={styles.hint}>{task.note}</Text> : null}</Pressable><View style={{ alignItems: "flex-end", marginLeft: 8 }}><Text style={styles.taskDate}>{taskDate}</Text>{onEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`${task.title} kaydını düzenle`} onPress={onEdit} hitSlop={8}><Text style={styles.taskDate}>Düzenle</Text></Pressable> : null}</View></View>;
}

function MilkStockCard({ events, now, update }: { events: CareEvent[]; now: Date; update: ReturnType<typeof useUykuvaState>["updateEvent"] }) {
  const inventory = useMemo(() => createMilkInventory(events, now), [events, now]);
  const batches = inventory.batches.filter((batch) => batch.remainingMl > 0);
  const dateTime = (date: Date) => `${date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} · ${time(date)}`;
  const discard = (event: CareEvent) => Alert.alert("Stoğu çıkar?", `${event.amountMl ?? 0} ml ${milkStorageLabel(event)} kaydı artık envanterde görünmeyecek.`, [
    { text: "Vazgeç", style: "cancel" },
    { text: "Stoktan çıkar", style: "destructive", onPress: () => update(event.id, { milkDiscardedAt: new Date().toISOString() }) }
  ]);
  const thaw = (event: CareEvent) => Alert.alert("Süt tamamen çözüldü mü?", "Süreyi yalnızca tamamen çözüldüğü anda başlatın. Çözülen sütü yeniden dondurmayın.", [
    { text: "Vazgeç", style: "cancel" },
    { text: "Tamamen çözüldü", onPress: () => update(event.id, { milkStorageLocation: "fridge", milkThawedAt: new Date().toISOString() }) }
  ]);
  const markWarmed = (event: CareEvent) => Alert.alert("Süt ısıtıldı veya oda sıcaklığına geldi mi?", "Bu andan itibaren 2 saatlik kullanım süresi başlar. Sütü yeniden dondurmayın.", [
    { text: "Vazgeç", style: "cancel" },
    { text: "Evet, süreyi başlat", onPress: () => update(event.id, { milkWarmedAt: new Date().toISOString() }) }
  ]);
  const moveTo = (event: CareEvent, location: "fridge" | "freezer") => update(event.id, { milkStorageLocation: location });
  return <>
    <SectionTitle title="Sağılan süt stoğu" action={`${inventory.availableMl} ml kullanılabilir`} />
    <Card>
      {batches.length ? batches.map((batch) => {
        const qualityDatePassed = !batch.isExpired && batch.bestBy.getTime() <= now.getTime() && batch.event.milkStorageLocation === "freezer" && !batch.isThawed;
        const dueSoon = !batch.isExpired && batch.useBy.getTime() <= now.getTime() + 48 * 60 * 60 * 1000;
        return <View key={batch.event.id} style={styles.eventRow}>
          <View style={styles.flex}><Text style={styles.eventTitle}>{batch.remainingMl} ml · {milkStorageLabel(batch.event)}</Text><Text style={styles.muted}>{batch.event.milkLabel?.trim() || `Sağım ${dateTime(new Date(batch.event.startedAt))}`}</Text>
            {batch.event.milkStorageLocation === "freezer" && !batch.isThawed ? <Text style={styles.muted}>En iyi kalite: {dateTime(batch.bestBy)} · Tavsiye edilen son tarih: {dateTime(batch.useBy)}</Text> : <Text style={styles.muted}>Kullanım aralığı: {dateTime(batch.useBy)} tarihine kadar</Text>}
            {batch.isExpired ? <Text style={styles.dangerText}>Önerilen kullanım süresi geçti</Text> : qualityDatePassed ? <Text style={styles.muted}>En iyi kalite dönemi geçti; CDC'nin kabul edilebilir saklama süresi sürüyor.</Text> : dueSoon ? <Text style={styles.dangerText}>Önümüzdeki 48 saatte kullanım süresi doluyor</Text> : null}
            {batch.event.milkStorageLocation === "freezer" && !batch.event.milkThawedAt && !batch.isExpired ? <Pressable accessibilityRole="button" onPress={() => thaw(batch.event)}><Text style={styles.linkText}>Tamamen çözüldüğünde işaretle</Text></Pressable> : null}
            {(batch.event.milkThawedAt || batch.event.milkStorageLocation === "fridge") && !batch.event.milkWarmedAt && !batch.isExpired ? <Pressable accessibilityRole="button" accessibilityLabel="Süt ısıtıldı veya oda sıcaklığına geldi olarak işaretle; iki saatlik süre başlat" onPress={() => markWarmed(batch.event)}><Text style={styles.linkText}>Isıtıldı / oda sıcaklığına geldi</Text></Pressable> : null}
            {batch.event.milkStorageLocation === "room" && !batch.isExpired ? <Pressable accessibilityRole="button" onPress={() => moveTo(batch.event, "fridge")}><Text style={styles.linkText}>Buzdolabına alındı olarak güncelle</Text></Pressable> : null}
            {batch.event.milkStorageLocation === "fridge" && !batch.event.milkThawedAt && !batch.event.milkWarmedAt && !batch.isExpired ? <Pressable accessibilityRole="button" onPress={() => moveTo(batch.event, "freezer")}><Text style={styles.linkText}>Dondurucuya alındı olarak güncelle</Text></Pressable> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Süt stoğunu çıkar" onPress={() => discard(batch.event)} style={styles.deleteButton}><Text style={styles.deleteText}>×</Text></Pressable>
        </View>;
      }) : <Text style={styles.body}>Henüz sağım stoğu yok. Beslenme kaydından “Sağım” seçerek miktarı ve saklama yerini ekleyebilirsiniz.</Text>}
      <Text style={styles.hint}>Önerilen süreler taze sağılmış süt ve uygun sıcaklık koşulları içindir. Tamamen çözündürülmüş süt 24 saat içinde, ısıtılmış veya oda sıcaklığına gelmiş süt 2 saat içinde kullanılmalıdır. CDC kuralları sağlıklı ve zamanında doğan bebeklere yöneliktir; bebeğiniz prematüre veya hastaysa sağlık uzmanınıza danışın.</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.cdc.gov/breastfeeding/breast-milk-preparation-and-storage/handling-breastmilk.html")}><Text style={styles.linkText}>CDC saklama rehberini aç</Text></Pressable>
    </Card>
  </>;
}

function Measure({ value, label }: { value: string; label: string }) {
  return <View style={styles.measure}><Text style={styles.measureValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;
}

function GrowthMetricChart({ indicator, measurements, baby }: { indicator: GrowthIndicator; measurements: CareEvent[]; baby: ReturnType<typeof useUykuvaState>["state"]["baby"] }) {
  const [width, setWidth] = useState(0);
  const entries = [...measurements].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((event) => ({ event, score: whoGrowthScore(baby, event, indicator) }))
    .filter((item): item is { event: CareEvent; score: GrowthScore } => Boolean(item.score));
  const label = { weight: "Kilo · kg", length: "Boy · cm", head: "Baş çevresi · cm" }[indicator];
  if (!entries.length) return null;
  const plotHeight = 106, left = 28, right = 8, top = 8;
  const minAge = entries[0]!.score.ageDays, maxAge = entries.at(-1)!.score.ageDays;
  const points = entries.map((item, index) => ({
    ...item,
    x: left + (maxAge === minAge ? (width - left - right) / 2 : (width - left - right) * (item.score.ageDays - minAge) / (maxAge - minAge)),
    y: top + (plotHeight - top) * (1 - (Math.max(-3, Math.min(3, item.score.z)) + 3) / 6)
  }));
  const guides = [{ z: 1.2816, label: "P90" }, { z: 0, label: "P50" }, { z: -1.2816, label: "P10" }];
  return <View style={styles.growthChartBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.growthChart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {guides.map((guide) => { const y = top + (plotHeight - top) * (1 - (guide.z + 3) / 6); return <View key={guide.label} style={[styles.growthGuide, { top: y, left, right }]}><Text style={styles.growthGuideLabel}>{guide.label}</Text></View>; })}
      {points.slice(1).map((point, index) => {
        const previous = points[index]!; const dx = point.x - previous.x; const dy = point.y - previous.y;
        const length = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return <View key={`line-${point.event.id}`} style={[styles.growthLine, { left: (previous.x + point.x - length) / 2, top: (previous.y + point.y) / 2, width: length, transform: [{ rotate: `${angle}deg` }] }]} />;
      })}
      {points.map((point) => <View key={point.event.id} style={[styles.growthPoint, { left: point.x - 4, top: point.y - 4 }]} />)}
    </View>
    <View style={styles.growthChartDates}><Text style={styles.muted}>{growthAgeLabel(baby, entries[0]!.event)}</Text><Text style={styles.muted}>{growthAgeLabel(baby, entries.at(-1)!.event)}</Text></View>
    <Text style={styles.hint}>Son ölçüm: P{Math.round(entries.at(-1)!.score.percentile)} · z {entries.at(-1)!.score.z.toFixed(1)}</Text>
  </View>;
}

function GrowthHistoryCard({ measurements, baby }: { measurements: CareEvent[]; baby: ReturnType<typeof useUykuvaState>["state"]["baby"] }) {
  if (!measurements.length) return null;
  const rows = measurements.slice(0, 8);
  return <>
    <SectionTitle title="Büyüme geçmişi" action={`${measurements.length} ölçüm`} />
    <Card tone="mint">
      {baby.growthChartSex ? <>
        <Text style={styles.cardTitle}>WHO büyüme eğrileri · {baby.growthChartSex === "female" ? "Kız çocuk" : "Erkek çocuk"}</Text>
        <GrowthMetricChart indicator="weight" measurements={measurements} baby={baby} />
        <GrowthMetricChart indicator="length" measurements={measurements} baby={baby} />
        <GrowthMetricChart indicator="head" measurements={measurements} baby={baby} />
      </> : <Text style={styles.hint}>WHO persentil eğrilerini görmek için Profil’den kız/erkek çocuk eğrisini seçin. Seçim yapmadan da ölçümlerinizi kaydedebilirsiniz.</Text>}
      {rows.map((event) => <View key={event.id} style={styles.growthHistoryRow}>
        <Text style={styles.muted}>{new Date(event.startedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</Text>
        <View style={styles.measureRow}><Measure value={event.weightG ? `${event.weightG} g` : "—"} label="Kilo" /><Measure value={event.lengthCm ? `${event.lengthCm} cm` : "—"} label="Boy" /><Measure value={event.headCm ? `${event.headCm} cm` : "—"} label="Baş" /></View>
      </View>)}
      {measurements.length > rows.length ? <Text style={styles.hint}>Son 8 ölçüm gösteriliyor.</Text> : null}
      <Text style={styles.hint}>WHO eğrileri 0–5 yaş standardını gösterir; tek bir persentil tıbbi değerlendirme veya tanı değildir. Ölçüm değişimini çocuk sağlığı uzmanıyla birlikte değerlendirin.</Text>
    </Card>
  </>;
}

function FamilyScreen({ app, onEditProfile, onAddCaregiver, onAddChild, onRestoreData }: { app: ReturnType<typeof useUykuvaState>; onEditProfile: () => void; onAddCaregiver: () => void; onAddChild: () => void; onRestoreData: () => void }) {
  const summary = handoffSummary(app.state, new Date(), app.state.preferences.handoffHours);
  const [encryptedBackupOpen, setEncryptedBackupOpen] = useState(false);
  const [quietStart, setQuietStart] = useState(app.state.preferences.quietStart);
  const [quietEnd, setQuietEnd] = useState(app.state.preferences.quietEnd);
  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ notificationsEnabled: false });
      await cancelSleepReminders();
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Uyku hatırlatması için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ notificationsEnabled: true });
  };
  const toggleCareTaskNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ careTaskRemindersEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Aşı ve randevu hatırlatmaları için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ careTaskRemindersEnabled: true });
  };
  const toggleDiaperNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ diaperRemindersEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Bez kontrol hatırlatması için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ diaperRemindersEnabled: true });
  };
  const toggleMilkExpiryNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ milkExpiryRemindersEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Süt kullanım süresi hatırlatmaları için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ milkExpiryRemindersEnabled: true });
  };
  const toggleRoutineNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ routineRemindersEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Akşam rutini hatırlatması için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ routineRemindersEnabled: true });
  };
  const saveQuietHours = () => {
    if (!isValidClock(quietStart) || !isValidClock(quietEnd)) return Alert.alert("Saatleri kontrol edin", "Saatleri 21:00 gibi SS:DD biçiminde yazın.");
    app.updatePreferences({ quietStart, quietEnd });
    Alert.alert("Kaydedildi", "Bu saatler arasında sessiz bildirim tercihleri uygulanacak.");
  };
  const exportPlainBackupFile = async () => {
    try {
      const file = new File(Paths.cache, `uykuva-yedek-${localDateValue(new Date())}.json`);
      file.create({ overwrite: true });
      await file.write(createDataExport(app.state));
      if (!await Sharing.isAvailableAsync()) return Alert.alert("Paylaşım kullanılamıyor", "Bu cihazda dosya paylaşımı açılamadı.");
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Uykuva yedeğini paylaş" });
    } catch {
      Alert.alert("Yedek oluşturulamadı", "JSON yedeği hazırlanırken bir sorun oluştu. Daha sonra yeniden deneyin.");
    }
  };
  const exportEncryptedBackupFile = async (password: string) => {
    try {
      const contents = await createEncryptedDataExport(app.state, password);
      const file = new File(Paths.cache, `uykuva-sifreli-yedek-${localDateValue(new Date())}.json`);
      file.create({ overwrite: true });
      await file.write(contents);
      if (!await Sharing.isAvailableAsync()) return Alert.alert("Paylaşım kullanılamıyor", "Bu cihazda dosya paylaşımı açılamadı.");
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Uykuva parola korumalı yedeğini paylaş" });
      setEncryptedBackupOpen(false);
    } catch (error) {
      Alert.alert("Şifreli yedek oluşturulamadı", error instanceof Error ? error.message : "Daha sonra yeniden deneyin.");
    }
  };
  const confirmDelete = () => Alert.alert(
    "Tüm cihaz verileri silinsin mi?",
    "Bebek profili, bakım kayıtları, uyku planı ve Uykuva'nın oluşturduğu yedek dosyaları bu cihazdan silinir. Planlı hatırlatmalar da kaldırılır.",
    [{ text: "Vazgeç", style: "cancel" }, { text: "Tümünü sil", style: "destructive", onPress: () => { void app.clearAllData().then(({ remindersCancelled, backupsDeleted }) => { const remaining = [!backupsDeleted ? "önbellekteki yedek dosyaları" : "", !remindersCancelled ? "planlı bildirimler" : ""].filter(Boolean); Alert.alert("Veriler silindi", remaining.length ? `Kayıtlar temizlendi; ancak ${remaining.join(" ve ")} kaldı.` : "Kayıtlar, yedek dosyaları ve planlı bildirimler bu cihazdan kaldırıldı."); }).catch(() => Alert.alert("Veriler silinemedi", "Cihaz kayıtları temizlenirken bir sorun oluştu. Yeniden deneyin.")); } }]
  );
  return (
    <>
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Aile ve bakım</Text><Text style={styles.pageIntro}>Devir anında arama yapmak yerine tek, güncel özet paylaşın.</Text>
      <SectionTitle title="Çocuk profilleri" action={`${app.state.children.length} çocuk`} />
      <Card>{app.state.children.map((child) => {
        const active = child.baby.id === app.state.activeChildId;
        return <Pressable key={child.baby.id} accessibilityRole="radio" accessibilityLabel={`${child.baby.name}, ${active ? "aktif profil" : "profili seç"}`} accessibilityState={{ selected: active }} onPress={() => app.setActiveChild(child.baby.id)} onLongPress={() => { if (app.state.children.length > 1) Alert.alert("Çocuk profilini sil", `${child.baby.name} profili, uyku planı ve kayıtları bu cihazdan silinsin mi?`, [{ text: "Vazgeç", style: "cancel" }, { text: "Profili sil", style: "destructive", onPress: () => app.deleteChild(child.baby.id) }]); }} style={styles.caregiverRow}><View style={[styles.caregiverAvatar, active && styles.caregiverAvatarActive]}><Text style={[styles.avatarText, active && styles.activeAvatarText]}>{child.baby.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text></View><View style={styles.flex}><Text style={styles.eventTitle}>{child.baby.name}</Text><Text style={styles.muted}>{active ? "Aktif profil" : "Dokunarak geçiş yap"}</Text></View><View style={[styles.radio, active && styles.radioActive]} /></Pressable>;
      })}<View style={styles.spacer12} /><PrimaryButton label="Çocuk profili ekle" quiet onPress={onAddChild} /><Text style={styles.hint}>Her çocuğun uyku planı, bakım kayıtları, gelişim gözlemleri ve talimatları ayrı tutulur. Silmek için profile basılı tutun.</Text></Card>
      <Card tone="mint"><View style={styles.settingRow}><View style={styles.flex}><Text style={styles.cardTitle}>{app.state.baby.name} profili</Text><Text style={styles.body}>Aktif bakım veren: {app.state.caregiverName}</Text></View><Pressable onPress={onEditProfile}><Text style={styles.editLink}>Profili düzenle</Text></Pressable></View></Card>
      <SectionTitle title="Bu cihazdaki bakım verenler" action={`${app.state.caregivers.length} kişi`} />
      <Card>{app.state.caregivers.map((caregiver) => {
        const active = caregiver.id === app.state.activeCaregiverId;
        const role = { parent: "Ebeveyn", family: "Aile", caregiver: "Bakıcı" }[caregiver.role];
        return <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} key={caregiver.id} onPress={() => app.setActiveCaregiver(caregiver.id)} onLongPress={() => { if (app.state.caregivers.length > 1) Alert.alert("Bakım vereni sil", `${caregiver.name} bu cihazdan kaldırılsın mı?`, [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: () => app.deleteCaregiver(caregiver.id) }]); }} style={styles.caregiverRow}><View style={[styles.caregiverAvatar, active && styles.caregiverAvatarActive]}><Text style={[styles.avatarText, active && styles.activeAvatarText]}>{caregiver.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text></View><View style={styles.flex}><Text style={styles.eventTitle}>{caregiver.name}</Text><Text style={styles.muted}>{role}{active ? " · aktif" : ""}</Text></View><View style={[styles.radio, active && styles.radioActive]} /></Pressable>;
      })}<View style={styles.spacer12} /><PrimaryButton label="Bu cihaza bakım veren ekle" quiet onPress={onAddCaregiver} /><Text style={styles.hint}>Kişiyi seçtiğinizde yeni kayıtlar onun adına yazılır. Silmek için basılı tutun.</Text></Card>
      <Card>
        <Text style={styles.cardTitle}>Bakım verene özel notlar</Text>
        <Text style={styles.body}>Beslenme düzeni, sakinleşmesine yardımcı olanlar ve aile talimatları gibi bilgileri yazın.</Text>
        <TextInput accessibilityLabel="Bakım verene özel aile talimatları" value={app.state.careInstructions ?? ""} onChangeText={app.updateCareInstructions} style={[styles.input, { minHeight: 112, textAlignVertical: "top" }]} multiline maxLength={1000} placeholder="Örn. Uykudan önce kısa ninni iyi geliyor; biberon miktarını bakım planındaki gibi verin." placeholderTextColor="#93A09C" />
        <Text style={styles.hint}>Bu not bu cihazda saklanır ve yalnızca “Bakım özetini paylaş” düğmesine bastığınızda devir metnine eklenir.</Text>
      </Card>
      <PrimaryButton label="Bakım özetini paylaş" onPress={() => void Share.share({ message: summary })} />
      <Card>
        <Text style={styles.cardTitle}>Bakım devri aralığı</Text>
        <Text style={styles.body}>Paylaşılan özetin kapsayacağı süreyi aile nöbetlerinize göre seçin.</Text>
        <View style={styles.choiceRow}>{([2, 4, 6, 8] as const).map((hours) => <Pill key={hours} label={`${hours} saat`} active={app.state.preferences.handoffHours === hours} onPress={() => app.updatePreferences({ handoffHours: hours })} />)}</View>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Başka telefona veri aktar</Text>
        <Text style={styles.body}>Bebek ve sağlık kayıtlarını içeren yedek, parola korumalı olarak aktarılabilir. Bu tek seferlik kopyadır; değişiklikler cihazlar arasında otomatik eşitlenmez. Diğer telefonda geri yüklerken aynı parolayı kullanın.</Text>
        <View style={styles.spacer12} />
        <PrimaryButton label="Parola korumalı yedeği paylaş" onPress={() => setEncryptedBackupOpen(true)} />
        <View style={styles.spacer12} />
        <PrimaryButton label="Şifresiz JSON yedeği paylaş" quiet onPress={() => Alert.alert("Şifresiz yedek", "Bu dosya bebek profili ve sağlık kayıtlarını okunabilir JSON olarak içerir. Yalnızca güvenli bir yerde saklayacağınızdan eminseniz paylaşın.", [{ text: "Vazgeç", style: "cancel" }, { text: "Şifresiz yedeği oluştur", onPress: () => void exportPlainBackupFile() }])} />
      </Card>
      <SectionTitle title="Hatırlatmalar" />
      <Card>
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Akşam rutini hatırlatması</Text><Text style={styles.muted}>Hedef yatış saatiniz ve etkin rutin sürenizden hesaplanır.</Text></View><Switch accessibilityLabel="Akşam rutini hatırlatması" accessibilityState={{ checked: app.state.preferences.routineRemindersEnabled }} value={app.state.preferences.routineRemindersEnabled} onValueChange={(value) => void toggleRoutineNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.routineRemindersEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.routineRemindersEnabled ? <Text style={styles.hint}>Önümüzdeki 7 gün için yerel bildirim kurulur. Etkin rutin adımı yoksa veya hatırlatma sessiz saate denk gelirse bildirim gönderilmez; hedef yatış ve rutin süresini Uyku sekmesinden değiştirebilirsiniz.</Text> : null}
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Uyku penceresi bildirimi</Text><Text style={styles.muted}>Tahmini pencere yaklaşırken sessizce hatırlatır.</Text></View><Switch accessibilityLabel="Uyku penceresi bildirimi" accessibilityState={{ checked: app.state.preferences.notificationsEnabled }} value={app.state.preferences.notificationsEnabled} onValueChange={(value) => void toggleNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.notificationsEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.notificationsEnabled ? <><Text style={styles.inputLabel}>Kaç dakika önce?</Text><View style={styles.choiceRow}>{([5, 10, 15, 20, 30] as const).map((minutes) => <Pill key={minutes} label={`${minutes} dk`} active={app.state.preferences.sleepReminderMinutes === minutes} onPress={() => app.updatePreferences({ sleepReminderMinutes: minutes })} />)}</View></> : null}
        {app.state.preferences.notificationsEnabled || app.state.preferences.careTaskRemindersEnabled || app.state.preferences.diaperRemindersEnabled || app.state.preferences.milkExpiryRemindersEnabled || app.state.preferences.routineRemindersEnabled ? <><Text style={styles.inputLabel}>Sessiz saatler</Text><View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Başlangıç</Text><TextInput accessibilityLabel="Sessiz saat başlangıcı" value={quietStart} onChangeText={setQuietStart} style={styles.compactInput} keyboardType="numbers-and-punctuation" /></View><View style={styles.timeField}><Text style={styles.muted}>Bitiş</Text><TextInput accessibilityLabel="Sessiz saat bitişi" value={quietEnd} onChangeText={setQuietEnd} style={styles.compactInput} keyboardType="numbers-and-punctuation" /></View></View><View style={styles.spacer12} /><PrimaryButton label="Sessiz saatleri kaydet" quiet onPress={saveQuietHours} /></> : null}
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Aşı ve randevu hatırlatmaları</Text><Text style={styles.muted}>Yaklaşan görevleri seçtiğiniz zamanda hatırlatır.</Text></View><Switch accessibilityLabel="Aşı ve randevu hatırlatmaları" accessibilityState={{ checked: app.state.preferences.careTaskRemindersEnabled }} value={app.state.preferences.careTaskRemindersEnabled} onValueChange={(value) => void toggleCareTaskNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.careTaskRemindersEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.careTaskRemindersEnabled ? <><Text style={styles.inputLabel}>Ne zaman hatırlatılsın?</Text><View style={styles.choiceRow}>{([{ minutes: 15, label: "15 dk" }, { minutes: 30, label: "30 dk" }, { minutes: 60, label: "1 saat" }, { minutes: 120, label: "2 saat" }, { minutes: 180, label: "3 saat" }, { minutes: 1440, label: "1 gün" }] as const).map(({ minutes, label }) => <Pill key={minutes} label={label} active={app.state.preferences.careTaskReminderMinutes === minutes} onPress={() => app.updatePreferences({ careTaskReminderMinutes: minutes })} />)}</View><Text style={styles.hint}>Hatırlatmalar sessiz saatlere denk gelirse sessiz dönem bitiminde, görev saatinden önce gönderilir.</Text></> : null}
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Bez kontrol hatırlatması</Text><Text style={styles.muted}>Son bez kaydından sonra seçtiğiniz sürede bir kez hatırlatır.</Text></View><Switch accessibilityLabel="Bez kontrol hatırlatması" accessibilityState={{ checked: app.state.preferences.diaperRemindersEnabled }} value={app.state.preferences.diaperRemindersEnabled} onValueChange={(value) => void toggleDiaperNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.diaperRemindersEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.diaperRemindersEnabled ? <><Text style={styles.inputLabel}>Kaç saat sonra?</Text><View style={styles.choiceRow}>{([2, 3, 4] as const).map((hours) => <Pill key={hours} label={`${hours} saat`} active={app.state.preferences.diaperReminderHours === hours} onPress={() => app.updatePreferences({ diaperReminderHours: hours })} />)}</View><Text style={styles.hint}>Hatırlatma sessiz saate denk gelirse sessiz dönem bitiminde gelir. Bez kontrolü isteğe bağlıdır; uygulama bir bakım sıklığı önermez.</Text></> : null}
        <View style={[styles.settingRow, { marginTop: 18 }]}><View style={styles.flex}><Text style={styles.eventTitle}>Sağılan süt kullanım süresi</Text><Text style={styles.muted}>Kullanım süresi yaklaşan ve stoğu kalan partiler için bir kez hatırlatır.</Text></View><Switch accessibilityLabel="Sağılan süt kullanım süresi hatırlatması" accessibilityState={{ checked: app.state.preferences.milkExpiryRemindersEnabled }} value={app.state.preferences.milkExpiryRemindersEnabled} onValueChange={(value) => void toggleMilkExpiryNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.milkExpiryRemindersEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.milkExpiryRemindersEnabled ? <><Text style={styles.inputLabel}>Kullanım süresinden ne kadar önce?</Text><View style={styles.choiceRow}>{([{ lead: "adaptive", label: "Otomatik" }, { lead: 2, label: "2 saat" }, { lead: 6, label: "6 saat" }, { lead: 12, label: "12 saat" }, { lead: 24, label: "1 gün" }, { lead: 48, label: "2 gün" }] as const).map(({ lead, label }) => <Pill key={lead} label={label} active={app.state.preferences.milkExpiryReminderLead === lead} onPress={() => app.updatePreferences({ milkExpiryReminderLead: lead })} />)}</View><Text style={styles.hint}>{app.state.preferences.milkExpiryReminderLead === "adaptive" ? "Otomatik seçenek, kalan süreye göre hatırlatma zamanını ayarlar." : "Seçilen süre kullanım süresinden uzun kalırsa hatırlatma kalan sürenin yaklaşık yarısında gönderilir."} Dondurulmuş ve çözülmemiş süt için en iyi kalite önerisi ile tavsiye edilen son tarih ayrı hatırlatılır; sessiz saatler gözetilir.</Text><Text style={styles.hint}>Saklama aralıkları genel rehberdir; özel sağlık durumlarında sağlık uzmanınıza danışın.</Text></> : null}
      </Card>
      <SectionTitle title="Verileriniz" />
      <Card><Text style={styles.cardTitle}>Kontrol sizde</Text><Text style={styles.body}>Parolalı yedeği aktarabilir, aynı bebeğin verileriyle birleştirebilir veya mevcut kayıtların yerine tamamen geri yükleyebilirsiniz.</Text><View style={styles.spacer12} /><PrimaryButton label="Yedek dosyasından aktar" quiet onPress={onRestoreData} /><View style={styles.spacer12} /><Pressable onPress={confirmDelete} style={styles.dangerButton}><Text style={styles.dangerText}>Tüm cihaz verilerini sil</Text></Pressable></Card>
    </ScrollView>
    <EncryptedBackupModal visible={encryptedBackupOpen} close={() => setEncryptedBackupOpen(false)} exportBackup={exportEncryptedBackupFile} />
    </>
  );
}

function EncryptedBackupModal({ visible, close, exportBackup }: { visible: boolean; close: () => void; exportBackup: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) { setPassword(""); setConfirmation(""); setBusy(false); }
  }, [visible]);
  if (!visible) return null;
  const submit = async () => {
    if (busy) return;
    if (password !== confirmation) return Alert.alert("Parolalar eşleşmiyor", "İki alana aynı parolayı yazın.");
    setBusy(true);
    await exportBackup(password);
    setBusy(false);
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Parola korumalı yedek</Text><Text style={styles.pageIntro}>Yedek AES-GCM ile şifrelenir. En az 12 karakterli bir parola oluşturun; diğer cihazda içe aktarırken aynı parola gerekir. Parolayı kaybederseniz Uykuva yedeği açamaz.</Text><Text style={styles.inputLabel}>Yedek parolası</Text><TextInput accessibilityLabel="Yedek parolası" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} textContentType="newPassword" /><Text style={styles.inputLabel}>Parolayı tekrar yazın</Text><TextInput accessibilityLabel="Yedek parolasını tekrar yazın" value={confirmation} onChangeText={setConfirmation} style={styles.input} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} textContentType="newPassword" /><View style={styles.spacer12} /><PrimaryButton label={busy ? "Yedek şifreleniyor…" : "Şifrele ve paylaş"} onPress={() => void submit()} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function DataRestoreModal({ visible, close, currentState, restore }: { visible: boolean; close: () => void; currentState: UykuvaAppState; restore: ReturnType<typeof useUykuvaState>["restoreData"] }) {
  const [raw, setRaw] = useState("");
  const [password, setPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  useEffect(() => { if (visible) { setRaw(""); setPassword(""); setDecrypting(false); } }, [visible]);
  if (!visible) return null;
  const reviewBackup = async () => {
    if (decrypting) return;
    setDecrypting(true);
    let restored;
    try {
      const input = raw.trim();
      const json = isEncryptedDataExport(input) ? await decryptDataExport(input, password) : input;
      restored = parseDataExport(json);
    } catch (error) {
      setDecrypting(false);
      return Alert.alert("Yedeği okuyamadım", error instanceof Error ? error.message : "JSON içeriğini ve yedek biçimini kontrol edin.");
    }
    setDecrypting(false);
    let merged: UykuvaAppState;
    try {
      merged = mergeDataStates(currentState, restored);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Bebek profili eşleşmedi.";
      return Alert.alert("Birleştirilemedi", `${reason}\n\nYedeği yine de mevcut verilerin yerine tamamen geri yükleyebilirsiniz.`);
    }
    const currentEventIds = new Set(currentState.events.map((event) => event.id));
    const currentTaskIds = new Set(currentState.careTasks.map((task) => task.id));
    const newEvents = restored.events.filter((event) => !currentEventIds.has(event.id)).length;
    const newTasks = restored.careTasks.filter((task) => !currentTaskIds.has(task.id)).length;
    Alert.alert(
      "Yedek geri yüklensin mi?",
      `${restored.baby.name} profiline ait ${newEvents} yeni bakım kaydı ve ${newTasks} yeni aşı/randevu var. Aynı kimlikli kayıtlar yinelenmez.\n\nBirleştirme cihazdaki profil, uyku planı ayarları ve tercihleri korur. Tam geri yükleme mevcut cihaz verilerinin yerini alır.`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Birleştir", onPress: () => { restore(merged); setRaw(""); close(); } },
        { text: "Tamamen geri yükle", style: "destructive", onPress: () => { restore(restored); setRaw(""); close(); } }
      ]
    );
  };
  const pickBackupFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return Alert.alert("Dosya bulunamadı", "JSON yedeğini seçip yeniden deneyin.");
      if (asset.size !== undefined && asset.size > 5 * 1024 * 1024) return Alert.alert("Yedek çok büyük", "Uykuva yedeklerinin dosya sınırı 5 MB.");
      const contents = await new File(asset.uri).text();
      if (contents.length > 5_000_000) return Alert.alert("Yedek çok büyük", "Uykuva yedeklerinin metin sınırı 5 milyon karakter.");
      setRaw(contents);
      Alert.alert("Yedek yüklendi", "Dosya kontrol için hazır. İçeriği doğrulayıp geri yüklemeyi onaylayın.");
    } catch {
      Alert.alert("Dosya açılamadı", "Uykuva JSON yedeğini seçip yeniden deneyin.");
    }
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Yedeği aktar</Text><Text style={styles.pageIntro}>Şifreli Uykuva yedeğini dosyadan seçin veya içeriğini yapıştırın. Şifreli dosyalar için yedeği oluştururken belirlediğiniz parolayı girin. Aynı bebeğin kayıtlarını birleştirebilir ya da mevcut verilerin yerine tamamen geri yükleyebilirsiniz.</Text><PrimaryButton label="Uykuva yedek dosyası seç" quiet onPress={() => void pickBackupFile()} /><TextInput accessibilityLabel="Şifreli yedek parolası" value={password} onChangeText={setPassword} style={[styles.input, { marginTop: 12 }]} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} placeholder="Parola · yalnızca şifreli yedek için" placeholderTextColor="#93A09C" /><TextInput accessibilityLabel="Yedek dosyası içeriği" value={raw} onChangeText={setRaw} style={[styles.input, { minHeight: 180, textAlignVertical: "top", marginTop: 12 }]} multiline maxLength={5_000_000} autoCapitalize="none" autoCorrect={false} placeholder="İsterseniz Uykuva yedeğini buraya yapıştırın" placeholderTextColor="#93A09C" /><Text style={styles.hint}>{raw.length.toLocaleString("tr-TR")} karakter · şifreli veya standart Uykuva yedeği</Text><View style={styles.spacer12} /><PrimaryButton label={decrypting ? "Yedek açılıyor…" : "Yedeği kontrol et ve aktar"} onPress={() => void reviewBackup()} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function ProfileModal({ visible, close, app }: { visible: boolean; close: () => void; app: ReturnType<typeof useUykuvaState> }) {
  const [babyName, setBabyName] = useState(app.state.baby.name);
  const [caregiverName, setCaregiverName] = useState(app.state.caregiverName);
  const [birthDate, setBirthDate] = useState(app.state.baby.birthDate);
  const [gestationalWeek, setGestationalWeek] = useState(String(app.state.baby.gestationalWeek));
  const [growthChartSex, setGrowthChartSex] = useState<"female" | "male" | undefined>(app.state.baby.growthChartSex);

  useEffect(() => {
    if (!visible) return;
    setBabyName(app.state.baby.name); setCaregiverName(app.state.caregiverName);
    setBirthDate(app.state.baby.birthDate); setGestationalWeek(String(app.state.baby.gestationalWeek)); setGrowthChartSex(app.state.baby.growthChartSex);
  }, [visible, app.state.baby, app.state.caregiverName]);

  const save = () => {
    const week = Number(gestationalWeek);
    const birth = new Date(`${birthDate}T12:00:00`);
    if (!babyName.trim() || !caregiverName.trim() || Number.isNaN(birth.getTime()) || birth > new Date() || !Number.isInteger(week) || week < 22 || week > 42) {
      return Alert.alert("Bilgileri kontrol edin", "Adları, doğum tarihini ve 22–42 arasındaki gebelik haftasını kontrol edin.");
    }
    const normalizedCaregiverName = caregiverName.trim().normalize("NFKC").toLocaleLowerCase("tr-TR");
    if (app.state.caregivers.some((caregiver) => caregiver.id !== app.state.activeCaregiverId && caregiver.name.trim().normalize("NFKC").toLocaleLowerCase("tr-TR") === normalizedCaregiverName)) {
      return Alert.alert("Bu bakım veren zaten var", "Kayıtların doğru kişiye bağlanması için her bakım verene farklı bir ad veya rol yazın.");
    }
    app.updateProfile({ ...app.state.baby, name: babyName.trim(), birthDate, gestationalWeek: week, growthChartSex }, caregiverName);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Profili düzenle</Text>
        <Field label="Bebeğin adı" value={babyName} onChangeText={setBabyName} />
        <Field label="Doğum tarihi" value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" />
        <Field label="Gebelik haftası" value={gestationalWeek} onChangeText={setGestationalWeek} keyboardType="number-pad" />
        <Text style={styles.inputLabel}>WHO büyüme eğrisi (isteğe bağlı)</Text><View style={styles.choiceRow}><Pill label="Kız çocuk" active={growthChartSex === "female"} onPress={() => setGrowthChartSex("female")} /><Pill label="Erkek çocuk" active={growthChartSex === "male"} onPress={() => setGrowthChartSex("male")} /><Pill label="Atla" active={!growthChartSex} onPress={() => setGrowthChartSex(undefined)} /></View>
        <Text style={styles.hint}>Bu seçim yalnızca WHO büyüme eğrisi karşılaştırması içindir.</Text>
        <Field label="Bakım veren" value={caregiverName} onChangeText={setCaregiverName} />
        <PrimaryButton label="Değişiklikleri kaydet" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} />
      </ScrollView>
    </Modal>
  );
}

function NightWakeModal({ visible, close, save }: { visible: boolean; close: () => void; save: (response: NightWakeResponse, occurredAt: string) => void }) {
  const [date, setDate] = useState(localDateValue(new Date()));
  const [clock, setClock] = useState(time(new Date()));
  const [response, setResponse] = useState<NightWakeResponse | "">("");
  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    setDate(localDateValue(now));
    setClock(time(now));
    setResponse("");
  }, [visible]);
  const submit = () => {
    if (!response) return Alert.alert("Desteği seçin", "Bu uyanmada verdiğiniz desteği işaretleyin.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidClock(clock)) return Alert.alert("Tarih ve saati kontrol edin", "Tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
    const occurredAt = new Date(`${date}T${clock}:00`);
    if (!Number.isFinite(occurredAt.getTime()) || localDateValue(occurredAt) !== date) return Alert.alert("Tarihi kontrol edin", "Gerçek bir takvim tarihi girin.");
    if (occurredAt.getTime() > Date.now() || occurredAt.getTime() < Date.now() - 24 * 60 * 60_000) return Alert.alert("Zamanı kontrol edin", "Gece uyanmasını son 24 saat içinde kaydedebilirsiniz.");
    save(response, occurredAt.toISOString());
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <Pressable style={styles.backdrop} onPress={close} />
    <ScrollView style={[styles.sheet, styles.quickSheet]} contentContainerStyle={styles.contentInset}>
      <View style={styles.sheetHandle} />
      <Text style={styles.pageTitle}>Gece uyanması</Text>
      <Text style={styles.pageIntro}>Saat otomatik dolar; hatırladığınız gerçek zamanla düzeltebilirsiniz.</Text>
      <View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Tarih</Text><TextInput accessibilityLabel="Uyanma tarihi" value={date} onChangeText={setDate} style={styles.compactInput} placeholder="YYYY-AA-GG" keyboardType="numbers-and-punctuation" /></View><View style={styles.timeField}><Text style={styles.muted}>Saat</Text><TextInput accessibilityLabel="Uyanma saati" value={clock} onChangeText={setClock} style={styles.compactInput} placeholder="02:15" keyboardType="numbers-and-punctuation" /></View></View>
      <Text style={styles.inputLabel}>Verilen destek</Text><View style={styles.choiceRow}>{NIGHT_WAKE_RESPONSE_OPTIONS.map((item) => <Pill key={item.id} label={item.label} active={response === item.id} onPress={() => setResponse(item.id)} />)}</View>
      <Text style={styles.hint}>Bu kayıt toplam uyanma sayısından ayrıdır; son 30 kayıt saklanır.</Text>
      <View style={styles.spacer12} /><PrimaryButton label="Uyanma kaydını ekle" onPress={submit} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} />
    </ScrollView>
  </Modal>;
}

function ChildProfileModal({ visible, close, add }: { visible: boolean; close: () => void; add: (profile: { babyName: string; birthDate: string; gestationalWeek: number }) => void }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gestationalWeek, setGestationalWeek] = useState("40");
  useEffect(() => {
    if (visible) { setName(""); setBirthDate(""); setGestationalWeek("40"); }
  }, [visible]);
  const save = () => {
    const week = Number(gestationalWeek);
    const birth = new Date(`${birthDate}T12:00:00`);
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(birth.getTime()) || localDateValue(birth) !== birthDate || birth > new Date() || !Number.isInteger(week) || week < 22 || week > 42) {
      return Alert.alert("Bilgileri kontrol edin", "Çocuğun adını, gerçek bir YYYY-AA-GG doğum tarihini ve 22–42 arasındaki gebelik haftasını girin.");
    }
    add({ babyName: name.trim(), birthDate, gestationalWeek: week });
    close();
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Çocuk profili ekle</Text><Text style={styles.pageIntro}>Bu çocuk için uyku planı, bakım kayıtları ve gelişim gözlemleri ayrı tutulur.</Text><Field label="Çocuğun adı" value={name} onChangeText={setName} placeholder="Örn. Deniz" /><Field label="Doğum tarihi" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-AA-GG" keyboardType="numbers-and-punctuation" /><Field label="Doğduğu gebelik haftası" value={gestationalWeek} onChangeText={setGestationalWeek} keyboardType="number-pad" /><View style={styles.spacer24} /><PrimaryButton label="Profili ekle ve aç" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function CaregiverModal({ visible, close, caregivers, add }: { visible: boolean; close: () => void; caregivers: string[]; add: (caregiver: Omit<Caregiver, "id">) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Caregiver["role"]>("parent");
  useEffect(() => {
    if (visible) { setName(""); setRole("parent"); }
  }, [visible]);
  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return Alert.alert("İsim gerekli", "Bakım verenin adını veya aile içindeki rolünü yazın.");
    const normalizedName = cleanName.normalize("NFKC").toLocaleLowerCase("tr-TR");
    if (caregivers.some((caregiver) => caregiver.trim().normalize("NFKC").toLocaleLowerCase("tr-TR") === normalizedName)) return Alert.alert("Bu bakım veren zaten var", "Kayıtların doğru kişiye bağlanması için farklı bir ad veya rol kullanın.");
    add({ name: cleanName, role });
    close();
  };
  const roles: { value: Caregiver["role"]; label: string }[] = [
    { value: "parent", label: "Ebeveyn" },
    { value: "family", label: "Aile" },
    { value: "caregiver", label: "Bakıcı" }
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Bakım veren ekle</Text>
        <Text style={styles.pageIntro}>Bu kişi bu cihazdaki profilde seçilebilir ve yaptığı yeni kayıtlar kendi adıyla görünür.</Text>
        <Field label="İsim veya rol" value={name} onChangeText={setName} placeholder="Örn. Baba, Anneanne, Ece" />
        <Text style={styles.inputLabel}>Rol</Text>
        <View style={styles.choiceRow}>{roles.map((item) => <Pill key={item.value} label={item.label} active={role === item.value} onPress={() => setRole(item.value)} />)}</View>
        <View style={styles.spacer24} /><PrimaryButton label="Bakım vereni ekle" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} />
      </ScrollView>
    </Modal>
  );
}

function QuickAction({ glyph, label, onPress, active }: { glyph: string; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={active ? "Devam eden kaydı yönetir." : "İlgili kayıt formunu açar."} accessibilityState={{ checked: Boolean(active) }} onPress={onPress} style={[styles.quick, active && styles.quickActive]}><Text style={styles.quickGlyph}>{glyph}</Text><Text style={styles.quickLabel}>{label}</Text></Pressable>;
}

function EventRow({ event, onPress, onDelete }: { event: CareEvent; onPress?: () => void; onDelete?: () => void }) {
  const confirmDelete = () => Alert.alert("Bakım kaydını sil?", `${eventTitle(event)} kaydı zaman çizelgesinden kalıcı olarak silinecek.`, [
    { text: "Vazgeç", style: "cancel" },
    { text: "Sil", style: "destructive", onPress: onDelete }
  ]);
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? `${eventTitle(event)} · saatleri düzenle` : undefined} accessibilityHint={onDelete ? "Silmek için basılı tutun ve onaylayın." : undefined} onPress={onPress} onLongPress={onDelete ? confirmDelete : undefined} style={styles.eventRow}>
      <View style={[styles.eventDot, { backgroundColor: event.kind === "sleep" ? colors.lavender : event.kind === "feed" ? colors.peach : colors.mint }]} />
      <View style={styles.flex}><Text style={styles.eventTitle}>{eventTitle(event)}</Text><Text style={styles.muted}>{event.caregiver}{event.kind === "health" && event.medicationReminderAt ? ` · plan hatırlatması ${new Date(event.medicationReminderAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}` : ""}{event.kind === "feed" && event.allergens?.length ? ` · etiket: ${event.allergens.join(", ")}` : ""}{event.kind === "feed" && event.reactionNote ? ` · gözlem: ${event.reactionNote}` : ""}{event.kind === "memory" && event.note ? ` · ${event.note}` : ""}</Text></View>
      <Text style={styles.eventTime}>{time(event.startedAt)}</Text>
    </Pressable>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "white" | "mint" | "peach" | "lavender" }) {
  return <View style={styles.stat}><Card tone={tone}><Text style={styles.statValue}>{value}</Text><Text style={styles.muted}>{label}</Text></Card></View>;
}

function CareTaskModal({ mode, task, close, add, update }: { mode: TaskMode; task: CareTask | null; close: () => void; add: ReturnType<typeof useUykuvaState>["addCareTask"]; update: ReturnType<typeof useUykuvaState>["updateCareTask"] }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateValue(tomorrow));
  const [clock, setClock] = useState("10:00");
  const [note, setNote] = useState("");
  const [repeat, setRepeat] = useState<"weekly" | "monthly" | undefined>(undefined);
  useEffect(() => {
    if (!mode) return;
    setTitle(task?.title ?? "");
    setDate(task ? localDateValue(new Date(task.dueAt)) : localDateValue(tomorrow));
    setClock(task ? time(task.dueAt) : "10:00");
    setNote(task?.note ?? "");
    setRepeat(task?.repeat);
  }, [mode, task?.id]);
  if (!mode) return null;
  const save = () => {
    const dueAt = new Date(`${date}T${clock}:00`);
    if (!title.trim()) return Alert.alert("Başlık gerekli", mode === "vaccine" ? "Aşının adını yazın." : "Randevuyu tanımlayın.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dueAt.getTime()) || localDateValue(dueAt) !== date || !isValidClock(clock)) return Alert.alert("Tarih ve saati kontrol edin", "Gerçek bir tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
    const changes = { type: mode, title: title.trim(), dueAt: dueAt.toISOString(), note: note.trim() || undefined, repeat: mode === "appointment" ? repeat : undefined };
    if (task) update(task.id, changes);
    else add(changes);
    setTitle(""); setNote(""); close();
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>{task ? "Kaydı düzenle" : mode === "vaccine" ? "Aşı ekle" : "Randevu ekle"}</Text><Text style={styles.pageIntro}>Uykuva resmi takvim yerine sizin girdiğiniz tarihi hatırlar; sağlık kararını uzmanınızla verin.</Text><Field label={mode === "vaccine" ? "Aşı adı" : "Randevu başlığı"} value={title} onChangeText={setTitle} placeholder={mode === "vaccine" ? "Örn. 6. ay aşıları" : "Örn. Çocuk doktoru kontrolü"} /><Field label="Tarih" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" /><Field label="Saat" value={clock} onChangeText={setClock} keyboardType="numbers-and-punctuation" placeholder="10:00" />{mode === "appointment" ? <><Text style={styles.inputLabel}>Tekrarlama</Text><View style={styles.choiceRow}><Pill label="Tek seferlik" active={!repeat} onPress={() => setRepeat(undefined)} /><Pill label="Haftalık" active={repeat === "weekly"} onPress={() => setRepeat("weekly")} /><Pill label="Aylık" active={repeat === "monthly"} onPress={() => setRepeat("monthly")} /></View><Text style={styles.hint}>Tekrarlı randevunun sonraki tarihi, bu kayıt tamamlandığında oluşturulur.</Text></> : null}<Field label={mode === "appointment" ? "Doktora sorularınız ve notlar" : "Not (isteğe bağlı)"} value={note} onChangeText={setNote} placeholder={mode === "appointment" ? "Örn. Uyku, beslenme veya büyüme hakkında sorular" : "İsteğe bağlı ek not"} /><PrimaryButton label={task ? "Değişiklikleri kaydet" : "Takvime ekle"} onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function VaccineSuggestionsModal({ visible, close, birthDate, tasks, add, now }: { visible: boolean; close: () => void; birthDate: string; tasks: CareTask[]; add: ReturnType<typeof useUykuvaState>["addCareTask"]; now: Date }) {
  const suggestions = useMemo(() => suggestedVaccineTasks(birthDate, tasks.map((task) => task.title), now), [birthDate, tasks, now]);
  if (!visible) return null;
  const babyAgeMonths = completedAgeMonths(birthDate, now);
  const hasVaricellaSecondDose = tasks.some((task) => {
    const title = task.title.toLocaleLowerCase("tr-TR");
    return task.type === "vaccine" && title.includes("suçiçeği") && (title.includes("2. doz") || title.includes("ikinci doz"));
  });
  const showVaricellaCatchUpInfo = babyAgeMonths >= 49 && babyAgeMonths <= 72 && !hasVaricellaSecondDose;
  const openOfficialSource = () => void Linking.openURL(TURKEY_VACCINE_SCHEDULE_UPDATE_SOURCE).catch(() => Alert.alert("Kaynak açılamadı", "T.C. Sağlık Bakanlığı duyurusuna şu anda erişilemiyor."));
  const addSuggestion = (suggestion: (typeof suggestions)[number]) => {
    add({ type: "vaccine", title: suggestion.title, dueAt: suggestion.dueAt.toISOString(), note: "Öneri: Türkiye Ulusal Çocukluk Dönemi Aşılama Takvimi. Uygulama zamanını aile hekiminizle teyit edin." });
    Alert.alert("Takvime eklendi", `${suggestion.title} için öneri tarihi eklendi.`);
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} contentContainerStyle={styles.contentInset}>
    <View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Aşı takvimi önerileri</Text>
    <Text style={styles.pageIntro}>Doğum tarihine göre yaklaşan yaş dönüm noktaları. Her öneriyi ayrı ayrı takvime ekleyebilirsiniz; uygulama aşı yapıldığını varsaymaz.</Text>
    <Card tone="peach"><Text style={styles.body}>Bu liste takip kolaylığı içindir. Aşı kartınızı ve aile hekiminizin önerisini esas alın. Geçmiş dozlar için telafi planını aile hekiminizle belirleyin.</Text></Card>
    {suggestions.length ? suggestions.map((suggestion) => <Card key={suggestion.id}><View style={styles.measureRow}><View style={styles.flex}><Text style={styles.eventTitle}>{suggestion.title}</Text><Text style={styles.muted}>{suggestion.ageMonths === 156 ? "13 yaş" : `${suggestion.ageMonths}. ay`} · {suggestion.dueAt.toLocaleDateString("tr-TR")}</Text></View><PrimaryButton label="Ekle" quiet onPress={() => addSuggestion(suggestion)} /></View></Card>) : <Card><Text style={styles.body}>Eklenebilecek ileri tarihli öneri kalmadı. Aşı kayıtlarınızı ve sıradaki adımları aile hekiminizle gözden geçirin.</Text></Card>}
    <Card><Text style={styles.eventTitle}>Kaynak sürümü: {TURKEY_VACCINE_SCHEDULE_BASE_VERSION} takvimi · güncelleme {new Date(`${TURKEY_VACCINE_SCHEDULE_UPDATE_DATE}T12:00:00`).toLocaleDateString("tr-TR")}</Text><Text style={styles.muted}>Ulusal takvim önerileri yalnızca takip kolaylığı içindir; uygulama çocuğun aşı uygunluğunu veya eksik dozunu belirlemez.</Text><View style={styles.spacer12} /><PrimaryButton label="Resmi Sağlık Bakanlığı duyurusunu aç" quiet onPress={openOfficialSource} /></Card>
    {showVaricellaCatchUpInfo ? <Card tone="peach"><Text style={styles.cardTitle}>49–72 ay için suçiçeği ikinci dozunu teyit edin</Text><Text style={styles.body}>Resmi duyuruda, ikinci dozu almamış 49–72 aylık çocuklar için yakalama uygulaması belirtiliyor. Aşı kartı ve e-Nabız kayıtlarını aile hekiminizle gözden geçirin; bu uygulama doz gerekliliğine karar vermez.</Text><View style={styles.spacer12} /><PrimaryButton label="Resmi yakalama duyurusunu aç" quiet onPress={openOfficialSource} /></Card> : null}
    <PrimaryButton label="Kapat" quiet onPress={close} /><View style={styles.spacer24} />
  </ScrollView></Modal>;
}

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function SleepEntryModal({ event, initialStartAt, initialSuggestedWindow, visible, close, add, update, bedtime, wakeTime }: { event: CareEvent | null; initialStartAt?: string; initialSuggestedWindow?: { start: string; end: string }; visible: boolean; close: () => void; add: ReturnType<typeof useUykuvaState>["addEvent"]; update: ReturnType<typeof useUykuvaState>["updateEvent"]; bedtime: string; wakeTime: string }) {
  const [startDate, setStartDate] = useState("");
  const [startClock, setStartClock] = useState("");
  const [endClock, setEndClock] = useState("");
  const [ongoing, setOngoing] = useState(false);
  const [sleepSupport, setSleepSupport] = useState<SleepSupport | "">("");

  useEffect(() => {
    if (!visible) return;
    if (event) {
      const start = new Date(event.startedAt);
      setStartDate(localDateValue(start));
      setStartClock(time(start));
      setEndClock(event.endedAt ? time(event.endedAt) : "");
      setOngoing(!event.endedAt);
      setSleepSupport(event.sleepSupport ?? "");
      return;
    }
    if (initialStartAt) {
      const suggestedStart = new Date(initialStartAt);
      setStartDate(localDateValue(suggestedStart));
      setStartClock(time(suggestedStart));
      setEndClock("");
      setOngoing(false);
      setSleepSupport("");
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() - 1);
    setStartDate(localDateValue(start));
    setStartClock(isValidClock(bedtime) ? bedtime : "20:00");
    setEndClock(isValidClock(wakeTime) ? wakeTime : "07:00");
    setOngoing(false);
    setSleepSupport("");
  }, [visible, event, initialStartAt, bedtime, wakeTime]);

  const save = () => {
    const start = new Date(`${startDate}T${startClock}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(start.getTime()) || localDateValue(start) !== startDate || !isValidClock(startClock)) {
      return Alert.alert("Yatış bilgisini kontrol edin", "Tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
    }
    if (start.getTime() > Date.now()) return Alert.alert("Gelecek bir saat seçildi", "Uyku başlangıcı şu andan sonra olamaz.");
    let end: Date | undefined;
    if (!ongoing) {
      if (!isValidClock(endClock)) return Alert.alert("Uyanış saatini yazın", "Saati SS:DD biçiminde girin veya uyku devam ediyorsa anahtarı açın.");
      end = new Date(`${startDate}T${endClock}:00`);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      if (end.getTime() > Date.now()) return Alert.alert("Gelecek bir saat seçildi", "Uyanış zamanı şu andan sonra olamaz.");
      if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return Alert.alert("Süreyi kontrol edin", "Bir uyku kaydı 24 saatten uzun olamaz.");
    } else if (Date.now() - start.getTime() > 24 * 60 * 60 * 1000) {
      return Alert.alert("Süreyi kontrol edin", "Devam eden bir uyku kaydı 24 saatten uzun olamaz.");
    }
    const patch = { startedAt: start.toISOString(), endedAt: end?.toISOString(), sleepSupport: sleepSupport || undefined };
    if (event) update(event.id, patch);
    else add({ kind: "sleep", ...patch, ...(initialSuggestedWindow ? { suggestedSleepWindowStartAt: initialSuggestedWindow.start, suggestedSleepWindowEndAt: initialSuggestedWindow.end } : {}) });
    close();
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>{event ? "Uyku kaydını düzenle" : "Geçmiş uyku ekle"}</Text><Text style={styles.pageIntro}>{initialStartAt ? "Tahmin aralığının orta saati dolduruldu. Gerçek yatış ve uyanış saatlerini kontrol edip gerekirse düzeltin." : "Başlangıç tarihini ve saatlerini kontrol edin. Uyanış saati yatıştan erkense sonraki gün olarak kaydedilir."}</Text><Field label="Yatış tarihi" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" /><Field label="Yatış saati" value={startClock} onChangeText={setStartClock} keyboardType="numbers-and-punctuation" placeholder="20:00" /><View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Uyku devam ediyor</Text><Text style={styles.muted}>Henüz uyanmadıysa açın.</Text></View><Switch accessibilityLabel="Uyku kaydı hâlâ devam ediyor" accessibilityState={{ checked: ongoing }} value={ongoing} onValueChange={setOngoing} trackColor={{ true: colors.sage }} thumbColor={ongoing ? colors.sageDark : "#E2E2E2"} /></View>{!ongoing ? <Field label="Uyanış saati" value={endClock} onChangeText={setEndClock} keyboardType="numbers-and-punctuation" placeholder="07:00" /> : null}<Text style={styles.inputLabel}>Uykuya geçişte kullanılan destek · isteğe bağlı</Text><Text style={styles.hint}>Birini seçin; bu bilgi uyku geçmişinizde görünür.</Text><View style={styles.choiceRow}><Pill label="Belirtme" active={!sleepSupport} onPress={() => setSleepSupport("")} />{SLEEP_SUPPORT_OPTIONS.map((item) => <Pill key={item.id} label={item.label} active={sleepSupport === item.id} onPress={() => setSleepSupport(item.id)} />)}</View><Text style={styles.hint}>Geçmiş kayıtlar zaman çizelgesinde başlangıç saatine dokunarak düzenlenir. Silmek için basılı tutun.</Text><View style={styles.spacer12} /><PrimaryButton label="Uyku kaydını kaydet" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function RecordTimeModal({ event, close, update }: { event: CareEvent | null; close: () => void; update: ReturnType<typeof useUykuvaState>["updateEvent"] }) {
  const [date, setDate] = useState("");
  const [startClock, setStartClock] = useState("");
  const [endClock, setEndClock] = useState("");

  useEffect(() => {
    if (!event) return;
    const start = new Date(event.startedAt);
    setDate(localDateValue(start));
    setStartClock(time(start));
    setEndClock(event.endedAt ? time(event.endedAt) : "");
  }, [event]);

  const save = () => {
    if (!event) return;
    const start = new Date(`${date}T${startClock}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(start.getTime()) || localDateValue(start) !== date || !isValidClock(startClock)) {
      return Alert.alert("Tarih ve saati kontrol edin", "Tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
    }
    if (start.getTime() > Date.now()) return Alert.alert("Gelecek bir saat seçildi", "Kayıt zamanı şu andan sonra olamaz.");
    let end: Date | undefined;
    if (event.endedAt) {
      if (!isValidClock(endClock)) return Alert.alert("Bitiş saatini kontrol edin", "Saati SS:DD biçiminde yazın.");
      end = new Date(`${date}T${endClock}:00`);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      if (end.getTime() > Date.now() || end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return Alert.alert("Bitiş saatini kontrol edin", "Bitiş, başlangıçtan sonra ve 24 saat içinde olmalı.");
    }
    const breastSessions = event.breastSessions?.length ? event.breastSessions.map((session, index) => ({
      ...session,
      ...(index === 0 ? { startedAt: start.toISOString() } : {}),
      ...(index === event.breastSessions!.length - 1 && session.endedAt && end ? { endedAt: end.toISOString() } : {})
    })) : undefined;
    update(event.id, { startedAt: start.toISOString(), ...(event.endedAt ? { endedAt: end?.toISOString() } : {}), ...(breastSessions ? { breastSessions } : {}) });
    close();
  };

  return <Modal visible={Boolean(event)} transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Kayıt saatini düzelt</Text><Text style={styles.pageIntro}>{event ? eventTitle(event) : ""} · Kayıt içeriği ve bakım veren bilgisi korunur.</Text><Field label="Tarih" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" /><Field label="Başlangıç saati" value={startClock} onChangeText={setStartClock} keyboardType="numbers-and-punctuation" placeholder="10:00" />{event?.endedAt ? <Field label="Bitiş saati" value={endClock} onChangeText={setEndClock} keyboardType="numbers-and-punctuation" placeholder="10:20" /> : null}<Text style={styles.hint}>Bitiş saati başlangıçtan erkense ertesi gün kabul edilir.</Text><View style={styles.spacer12} /><PrimaryButton label="Değişikliği kaydet" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function QuickLogModal({ mode, close, app, now }: { mode: LogMode; close: () => void; app: ReturnType<typeof useUykuvaState>; now: Date }) {
  const add = app.addSimpleEvent;
  const [amount, setAmount] = useState("90");
  const [feedType, setFeedType] = useState<"breast" | "bottle" | "solid" | "pump">("breast");
  const [bottleSource, setBottleSource] = useState<"formula" | "expressed">("formula");
  const [milkStorageLocation, setMilkStorageLocation] = useState<"room" | "fridge" | "freezer">("fridge");
  const [milkLabel, setMilkLabel] = useState("");
  const [foods, setFoods] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [reaction, setReaction] = useState("");
  const [note, setNote] = useState("");
  const [healthType, setHealthType] = useState<"temperature" | "medicine" | "symptom">("temperature");
  const [temperature, setTemperature] = useState("37.0");
  const [medicineName, setMedicineName] = useState("");
  const [dose, setDose] = useState("");
  const [medicationReminderDate, setMedicationReminderDate] = useState(localDateValue(now));
  const [medicationReminderClock, setMedicationReminderClock] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [lengthPosition, setLengthPosition] = useState<"recumbent" | "standing">(Date.now() - Date.parse(`${app.state.baby.birthDate}T00:00:00`) < 731 * 86_400_000 ? "recumbent" : "standing");
  const [head, setHead] = useState("");
  const [memoryTitle, setMemoryTitle] = useState("");
  useEffect(() => {
    if (mode !== "growth") return;
    setLengthPosition(Date.now() - Date.parse(`${app.state.baby.birthDate}T00:00:00`) < 731 * 86_400_000 ? "recumbent" : "standing");
  }, [mode, app.state.baby.birthDate]);
  useEffect(() => {
    if (mode !== "health") return;
    setHealthType("temperature"); setMedicineName(""); setDose(""); setMedicationReminderDate(localDateValue(new Date())); setMedicationReminderClock(""); setNote("");
  }, [mode]);
  if (!mode) return null;
  const save = (details: Partial<CareEvent>) => { add(mode, details); setNote(""); close(); };
  const title = { feed: "Beslenme kaydı", diaper: "Bez kaydı", note: "Bakım notu", health: "Sağlık kaydı", growth: "Büyüme ölçümü", memory: "Anı günlüğü" }[mode];
  const suggestedSide = nextBreastSide(app.state.events);
  const milkInventory = createMilkInventory(app.state.events);
  const saveHealth = async () => {
    if (healthType === "temperature") {
      const value = Number(temperature.replace(",", "."));
      if (!Number.isFinite(value) || value < 30 || value > 45) return Alert.alert("Değeri kontrol edin", "Sıcaklığı 30–45 °C arasında yazın.");
      return save({ healthType, temperatureC: value, note });
    }
    if (healthType === "medicine" && !medicineName.trim()) return Alert.alert("İlaç adını yazın", "Bu alan yalnızca verdiğiniz bilgiyi kaydeder; doz önermez.");
    let medicationReminderAt: string | undefined;
    let permissionMissing = false;
    if (healthType === "medicine" && medicationReminderClock.trim()) {
      const reminder = new Date(`${medicationReminderDate}T${medicationReminderClock}:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(medicationReminderDate) || localDateValue(reminder) !== medicationReminderDate || !isValidClock(medicationReminderClock)) return Alert.alert("Hatırlatma saatini kontrol edin", "Tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
      if (reminder.getTime() <= now.getTime()) return Alert.alert("Gelecek bir saat seçin", "Hatırlatma saati şu andan sonra olmalı.");
      try { medicationReminderAt = await requestNotificationPermission() ? reminder.toISOString() : undefined; }
      catch { medicationReminderAt = undefined; }
      permissionMissing = !medicationReminderAt;
    }
    save({ healthType, medicineName: medicineName.trim() || undefined, doseAsEntered: dose.trim() || undefined, medicationReminderAt, note: note.trim() || undefined });
    if (permissionMissing) Alert.alert("İlaç kaydı eklendi", "Bildirim izni olmadığı için saat hatırlatması kurulmadı. İzni cihaz ayarlarından açabilirsiniz.");
  };
  const saveGrowth = () => {
    const weightG = Number(weight.replace(",", "."));
    const lengthCm = Number(length.replace(",", "."));
    const headCm = Number(head.replace(",", "."));
    if (![weightG, lengthCm, headCm].some((value) => Number.isFinite(value) && value > 0)) return Alert.alert("En az bir ölçüm yazın", "Kilo, boy veya baş çevresinden en az biri gerekli.");
    save({ weightG: weightG > 0 ? weightG : undefined, lengthCm: lengthCm > 0 ? lengthCm : undefined, lengthPosition: lengthCm > 0 ? lengthPosition : undefined, headCm: headCm > 0 ? headCm : undefined });
  };
  const saveSolidMeal = () => {
    const list = foods.split(",").map((item) => item.trim()).filter(Boolean);
    if (!list.length) return Alert.alert("Yiyecekleri yazın", "En az bir yiyecek adı gerekli.");
    save({ feedType: "solid", foods: list, allergens: selectedAllergens, reactionNote: reaction.trim() || undefined });
    setFoods(""); setReaction(""); setSelectedAllergens([]);
  };
  const saveMemory = () => {
    if (!memoryTitle.trim() && !note.trim()) return Alert.alert("Anıyı yazın", "Bir başlık veya kısa not girin.");
    add("memory", { memoryTitle: memoryTitle.trim() || "Anı", note: note.trim() || undefined });
    setMemoryTitle(""); setNote(""); close();
  };
  const toggleAllergen = (allergen: string) => setSelectedAllergens((current) => current.includes(allergen) ? current.filter((item) => item !== allergen) : [...current, allergen]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHandle} />
        <Text style={styles.pageTitle}>{title}</Text>
        {mode === "feed" ? <>
          {app.runningFeed ? <Card tone="peach"><Text style={styles.cardTitle}>Emzirme devam ediyor · {feedingElapsedMinutes(app.runningFeed, now)} dk</Text><Text style={styles.body}>Sol {breastfeedingSideMinutes(app.runningFeed, now).left} dk · Sağ {breastfeedingSideMinutes(app.runningFeed, now).right} dk · {time(app.runningFeed.startedAt)} başlangıç</Text><Text style={styles.inputLabel}>Taraf değiştir</Text><View style={styles.choiceRow}>{app.runningFeed.breastSide !== "left" ? <Pill label="Sağdan sola geç" onPress={() => app.toggleBreastfeed("left")} /> : <Pill label="Soldan sağa geç" onPress={() => app.toggleBreastfeed("right")} />}</View><View style={styles.spacer12} /><PrimaryButton label="Emzirmeyi bitir" onPress={() => { app.toggleBreastfeed("both"); close(); }} /></Card> : <>
            <View style={styles.choiceRow}><Pill label="Emzirme" active={feedType === "breast"} onPress={() => setFeedType("breast")} /><Pill label="Biberon" active={feedType === "bottle"} onPress={() => setFeedType("bottle")} /><Pill label="Katı gıda" active={feedType === "solid"} onPress={() => setFeedType("solid")} /><Pill label="Sağım" active={feedType === "pump"} onPress={() => setFeedType("pump")} /></View>
            {feedType === "breast" ? <><Text style={styles.inputLabel}>Hangi tarafla başlıyor?</Text>{suggestedSide ? <Text style={styles.suggestion}>Son kayda göre sıradaki taraf: {suggestedSide === "left" ? "sol" : "sağ"}</Text> : null}<View style={styles.choiceRow}><Pill label="Sol" active={suggestedSide === "left"} onPress={() => { app.toggleBreastfeed("left"); close(); }} /><Pill label="Sağ" active={suggestedSide === "right"} onPress={() => { app.toggleBreastfeed("right"); close(); }} /></View></> : null}
            {feedType === "bottle" ? <><Text style={styles.inputLabel}>Süt türü</Text><View style={styles.choiceRow}><Pill label="Mama / diğer" active={bottleSource === "formula"} onPress={() => setBottleSource("formula")} /><Pill label="Sağılan süt" active={bottleSource === "expressed"} onPress={() => setBottleSource("expressed")} /></View>{bottleSource === "expressed" ? <Text style={styles.hint}>Takipli stok: {milkInventory.availableMl} ml. Kaydedince en eski uygun partiden düşülür; miktar fazla olsa da beslenme kaydı tutulur.</Text> : null}<Field label="Miktar (ml)" value={amount} onChangeText={setAmount} keyboardType="number-pad" /><PrimaryButton label="Biberonu kaydet" onPress={() => { const value = Number(amount); if (!Number.isFinite(value) || value <= 0 || value > 1000) return Alert.alert("Miktarı kontrol edin", "Pozitif bir ml değeri yazın."); save({ feedType: "bottle", amountMl: value, bottleSource }); }} /></> : null}
            {feedType === "pump" ? <><Field label="Sağılan miktar (ml)" value={amount} onChangeText={setAmount} keyboardType="number-pad" /><Text style={styles.inputLabel}>Saklama yeri</Text><View style={styles.choiceRow}><Pill label="Oda · 4 sa" active={milkStorageLocation === "room"} onPress={() => setMilkStorageLocation("room")} /><Pill label="Buzdolabı · 4 gün" active={milkStorageLocation === "fridge"} onPress={() => setMilkStorageLocation("fridge")} /><Pill label="Dondurucu · 6–12 ay" active={milkStorageLocation === "freezer"} onPress={() => setMilkStorageLocation("freezer")} /></View><Field label="Kap etiketi (isteğe bağlı)" value={milkLabel} onChangeText={setMilkLabel} placeholder="Örn. Pazartesi sabah" /><Text style={styles.hint}>Saklama aralıkları CDC'nin 25°C veya altındaki oda, 4°C buzdolabı ve -18°C veya altındaki dondurucu önerilerine dayanır. Prematüre veya hasta bebeklerde sağlık uzmanınıza danışın.</Text><PrimaryButton label="Sağım ve stoğu kaydet" onPress={() => { const value = Number(amount); if (!Number.isFinite(value) || value <= 0 || value > 2000) return Alert.alert("Miktarı kontrol edin", "0–2000 ml arasında pozitif bir miktar yazın."); save({ feedType: "pump", amountMl: value, milkStorageLocation, milkLabel: milkLabel.trim() || undefined }); setMilkLabel(""); }} /></> : null}
            {feedType === "solid" ? <><Field label="Yiyecekler" value={foods} onChangeText={setFoods} placeholder="Örn. yoğurt, muz" /><Text style={styles.inputLabel}>Takip edilen alerjen içerikleri (isteğe bağlı)</Text><View style={styles.choiceRow}>{TRACKED_ALLERGENS.map((allergen) => <Pill key={allergen} label={allergen} active={selectedAllergens.includes(allergen)} onPress={() => toggleAllergen(allergen)} />)}</View><Text style={styles.hint}>Bunlar yalnızca öğün kaydına eklenen etiketlerdir; güvenli gıda veya alerji önerisi değildir.</Text><Field label="Gözlenen tepki (isteğe bağlı)" value={reaction} onChangeText={setReaction} placeholder="Gözleminizi yazın" /><PrimaryButton label="Öğünü kaydet" onPress={saveSolidMeal} /></> : null}
          </>}
        </> : null}
        {mode === "diaper" ? <View style={styles.choiceRow}><Pill label="Islak" active onPress={() => save({ diaperType: "wet" })} /><Pill label="Kirli" onPress={() => save({ diaperType: "dirty" })} /><Pill label="İkisi" onPress={() => save({ diaperType: "both" })} /></View> : null}
        {mode === "note" ? <><Text style={styles.inputLabel}>Not</Text><TextInput value={note} onChangeText={setNote} multiline placeholder="Bakımı devralan kişinin bilmesi gereken…" style={[styles.input, styles.noteInput]} /><PrimaryButton label="Notu kaydet" onPress={() => save({ note })} /></> : null}
        {mode === "memory" ? <><Text style={styles.inputLabel}>Bir anı seçin (isteğe bağlı)</Text><View style={styles.choiceRow}>{memoryPrompts.map((prompt) => <Pill key={prompt} label={prompt} active={memoryTitle === prompt} onPress={() => setMemoryTitle(prompt)} />)}</View><Field label="Anı başlığı" value={memoryTitle} onChangeText={setMemoryTitle} placeholder="İlk kez parkta uyudu" /><Text style={styles.inputLabel}>Detay (isteğe bağlı)</Text><TextInput value={note} onChangeText={setNote} multiline maxLength={1000} placeholder="Bu günü hatırlamak için kısa bir not…" style={[styles.input, styles.noteInput]} /><PrimaryButton label="Anıyı kaydet" onPress={saveMemory} /></> : null}
        {mode === "health" ? <>
          <View style={styles.choiceRow}><Pill label="Ateş" active={healthType === "temperature"} onPress={() => setHealthType("temperature")} /><Pill label="İlaç" active={healthType === "medicine"} onPress={() => setHealthType("medicine")} /><Pill label="Belirti" active={healthType === "symptom"} onPress={() => setHealthType("symptom")} /></View>
          {healthType === "temperature" ? <Field label="Ölçülen sıcaklık (°C)" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" /> : null}
          {healthType === "medicine" ? <><Field label="İlaç adı" value={medicineName} onChangeText={setMedicineName} placeholder="Kutudaki adıyla" /><Field label="Verdiğiniz miktar (isteğe bağlı)" value={dose} onChangeText={setDose} placeholder="Örn. 2 ml — öneri değildir" /><Text style={styles.inputLabel}>Sağlık planınızda belirtilen sonraki hatırlatma (isteğe bağlı)</Text><View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Tarih</Text><TextInput value={medicationReminderDate} onChangeText={setMedicationReminderDate} style={styles.compactInput} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" /></View><View style={styles.timeField}><Text style={styles.muted}>Saat</Text><TextInput value={medicationReminderClock} onChangeText={setMedicationReminderClock} style={styles.compactInput} keyboardType="numbers-and-punctuation" placeholder="SS:DD" /></View></View><Text style={styles.hint}>Saati yalnızca sağlık uzmanınızın veya ilaç etiketinin talimatına göre girin. Uykuva doz ya da tekrar aralığı önermez; hatırlatma verdiğiniz saatte yalnızca planınızı kontrol etmenizi söyler.</Text></> : null}
          <Text style={styles.inputLabel}>{healthType === "symptom" ? "Belirti notu" : "Not (isteğe bağlı)"}</Text><TextInput value={note} onChangeText={setNote} multiline style={[styles.input, styles.noteInput]} placeholder="Gözleminizi yazın" />
          <PrimaryButton label="Sağlık kaydını ekle" onPress={saveHealth} />
          <Text style={styles.disclaimer}>Uykuva ilaç miktarı veya kullanım aralığı önermez; yalnızca girdiğiniz kaydı ve isteğe bağlı hatırlatmayı saklar.</Text>
        </> : null}
        {mode === "growth" ? <><Field label="Kilo (gram)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Örn. 6450" /><Field label="Boy (cm)" value={length} onChangeText={setLength} keyboardType="decimal-pad" placeholder="Örn. 63,5" /><Text style={styles.inputLabel}>Boy nasıl ölçüldü?</Text><View style={styles.choiceRow}><Pill label="Yatarak" active={lengthPosition === "recumbent"} onPress={() => setLengthPosition("recumbent")} /><Pill label="Ayakta" active={lengthPosition === "standing"} onPress={() => setLengthPosition("standing")} /></View><Text style={styles.hint}>WHO eğrisinde yaşa göre 0,7 cm dönüşümü için kullanılır.</Text><Field label="Baş çevresi (cm)" value={head} onChangeText={setHead} keyboardType="decimal-pad" placeholder="Örn. 41" /><PrimaryButton label="Ölçümü kaydet" onPress={saveGrowth} /></> : null}
        <View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingTop: StatusBar.currentHeight ?? 0 },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { color: colors.inkSoft, fontSize: 13, marginTop: 12 },
  storageRecovery: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 24, paddingTop: 80 },
  onboarding: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 26, paddingTop: 80 },
  onboardingMark: { width: 74, height: 74, borderRadius: 26, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  onboardingMoon: { color: colors.sageDark, fontSize: 38 },
  onboardingBrand: { color: colors.sageDark, fontSize: 18, fontWeight: "800", letterSpacing: 2, marginTop: 28 },
  onboardingTitle: { color: colors.ink, fontSize: 38, lineHeight: 44, fontWeight: "800", letterSpacing: -1.5, marginTop: 16 },
  onboardingBody: { color: colors.inkSoft, fontSize: 16, lineHeight: 25, marginTop: 16 },
  onboardingBottom: { marginTop: "auto", paddingBottom: 28 },
  privacyLine: { color: colors.inkSoft, fontSize: 11, textAlign: "center", marginTop: 13 },
  formPage: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 40 },
  shell: { flex: 1, backgroundColor: colors.paper },
  header: { height: 72, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: colors.ink, fontSize: 25, fontWeight: "800", letterSpacing: -1.2 },
  headerSub: { color: colors.inkSoft, fontSize: 12, marginTop: 1 },
  headerCaregiver: { minHeight: 36, justifyContent: "center", paddingHorizontal: 2 },
  headerCaregiverText: { color: colors.sageDark, fontSize: 12, fontWeight: "700" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.ink, fontWeight: "800" },
  content: { flex: 1 },
  contentInset: { paddingHorizontal: 18, paddingBottom: 110 },
  cardTopline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.sageDark, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  confidence: { color: colors.sageDark, fontSize: 11, fontWeight: "700", backgroundColor: "rgba(255,255,255,.5)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  heroTime: { color: colors.ink, fontSize: 38, fontWeight: "800", letterSpacing: -1.6, marginTop: 14, marginBottom: 8 },
  wakeForecastPanel: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: colors.mint },
  wakeForecastTime: { color: colors.sageDark, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  feedForecast: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.8, marginTop: 12, marginBottom: 7 },
  heroSmall: { color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: -1, marginVertical: 10 },
  body: { color: colors.inkSoft, fontSize: 14, lineHeight: 21 },
  inputError: { color: colors.danger, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 8 },
  awake: { color: colors.sageDark, fontSize: 13, fontWeight: "700", marginTop: 14 },
  nightEntry: { minHeight: 48, borderRadius: 15, backgroundColor: "#E7ECE6", alignItems: "center", justifyContent: "center", marginBottom: 14, paddingHorizontal: 14 },
  nightEntryText: { color: colors.sageDark, fontSize: 13, fontWeight: "800" },
  nightScreen: { flex: 1, backgroundColor: "#101715", paddingHorizontal: 22, paddingTop: 24, paddingBottom: 22, justifyContent: "space-between" },
  nightTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nightEyebrow: { color: "#91A79B", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  nightBaby: { color: "#E5ECE7", fontSize: 25, fontWeight: "700", marginTop: 5 },
  nightExit: { minWidth: 64, minHeight: 48, borderRadius: 15, backgroundColor: "#25332D", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  nightCaregiver: { minHeight: 44, borderRadius: 14, backgroundColor: "#17221D", borderWidth: 1, borderColor: "#34443B", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  nightCaregiverText: { color: "#D7E5DA", fontSize: 13, fontWeight: "700" },
  nightExitText: { color: "#DCE7DF", fontSize: 14, fontWeight: "700" },
  nightTimerCard: { borderRadius: 28, backgroundColor: "#19231F", padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#28362F" },
  nightTimer: { color: "#E8EFE9", fontSize: 42, fontWeight: "700", letterSpacing: -1.4, marginVertical: 12 },
  nightHint: { color: "#9CAC9F", fontSize: 13, textAlign: "center" },
  nightActions: { gap: 12 },
  nightAction: { minHeight: 88, borderRadius: 21, backgroundColor: "#1B2621", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#2A3931" },
  nightActionPrimary: { backgroundColor: "#26382F", borderColor: "#3A5144" },
  nightActionGlyph: { color: "#B6CBB9", fontSize: 25, width: 42 },
  nightActionTitle: { color: "#E2EAE4", fontSize: 16, fontWeight: "700", flex: 1 },
  nightActionHint: { color: "#91A197", fontSize: 11 },
  nightFootnote: { color: "#77877D", fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 10 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 4, rowGap: 10 },
  quick: { width: "31.5%", minHeight: 82, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  quickActive: { backgroundColor: colors.peachSoft },
  quickGlyph: { color: colors.sageDark, fontSize: 25, marginBottom: 8 },
  quickLabel: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  spacer12: { height: 12 },
  spacer24: { height: 24 },
  disclaimer: { color: colors.inkSoft, fontSize: 11, lineHeight: 17, textAlign: "center", paddingHorizontal: 16, marginVertical: 20 },
  pageTitle: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -1.2, marginTop: 10 },
  pageIntro: { color: colors.inkSoft, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 20 },
  pills: { marginBottom: 16, marginHorizontal: -1 },
  eventRow: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line },
  eventDot: { width: 11, height: 11, borderRadius: 6, marginRight: 12 },
  eventTitle: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  eventTime: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  muted: { color: colors.inkSoft, fontSize: 12, marginTop: 3 },
  flex: { flex: 1 },
  taskRow: { flexDirection: "row", alignItems: "center", minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.line },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: colors.sage, marginRight: 12, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  check: { color: "white", fontWeight: "800" },
  taskText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20 },
  taskTextDone: { color: colors.inkSoft, textDecorationLine: "line-through" },
  readinessNote: { color: colors.sageDark, fontSize: 12, lineHeight: 18, marginTop: 14 },
  suggestion: { color: colors.sageDark, fontSize: 12, fontWeight: "700", marginTop: 2 },
  routineRow: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  routineToggle: { flex: 1, flexDirection: "row", alignItems: "center", minHeight: 48 },
  routineControls: { flexDirection: "row", gap: 4, marginLeft: 6 },
  routineMove: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#F0F2ED", alignItems: "center", justifyContent: "center" },
  routineMoveDisabled: { opacity: 0.3 },
  routineMoveText: { color: colors.sageDark, fontSize: 17, fontWeight: "800" },
  pausedTask: { opacity: 0.5 },
  pausedMessage: { color: colors.inkSoft, fontSize: 13, textAlign: "center", paddingVertical: 14 },
  planProgressBar: { flexDirection: "row", gap: 4, marginTop: 14, marginBottom: 12 },
  planProgressSegment: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "#E5EAE5" },
  planProgressComplete: { backgroundColor: colors.sageDark },
  planProgressCurrent: { backgroundColor: colors.sage, borderWidth: 1, borderColor: colors.sageDark },
  nightGuideHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  nightGuideHeaderText: { flex: 1, flexShrink: 1, minWidth: 0, maxWidth: "100%" },
  nightGuideChevron: { width: 34, height: 34, borderRadius: 12, overflow: "hidden", backgroundColor: colors.mint, color: colors.sageDark, textAlign: "center", textAlignVertical: "center", fontSize: 24, fontWeight: "600", marginLeft: 10 },
  nightGuideContent: { width: "100%", maxWidth: "100%", alignSelf: "stretch", borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 8 },
  nightGuideStep: { width: "100%", maxWidth: "100%", alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 8 },
  nightGuideStepText: { flex: 1, flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, maxWidth: "100%", fontSize: 12, lineHeight: 18 },
  methodCompare: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 12, paddingTop: 10, gap: 7 },
  methodCompareRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  methodCompareLabel: { width: 92, color: colors.inkSoft, fontSize: 11, fontWeight: "700" },
  methodCompareText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 18 },
  currentWakeWindow: { backgroundColor: colors.mint, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, marginHorizontal: -8 },
  currentWakeWindowText: { color: colors.sageDark, fontWeight: "800" },
  awakeWindowRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  awakeWindowLabel: { flex: 1, minWidth: 0, color: colors.inkSoft, fontSize: 12, fontWeight: "700" },
  awakeWindowValue: { flexShrink: 0, color: colors.ink, fontSize: 11, textAlign: "right" },
  nightGuideNumber: { width: 22, height: 22, flexShrink: 0, borderRadius: 11, overflow: "hidden", backgroundColor: colors.mint, color: colors.sageDark, textAlign: "center", textAlignVertical: "center", fontSize: 12, fontWeight: "800" },
  routineDisabled: { opacity: 0.45 },
  miniCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.sage, alignItems: "center", justifyContent: "center", marginRight: 8 },
  routineNo: { width: 28, color: colors.sageDark, fontSize: 12, fontWeight: "800" },
  inlineForm: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  minutesInput: { width: 62, marginTop: 0 },
  hint: { color: colors.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 10 },
  easeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  easeButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,.58)", alignItems: "center", justifyContent: "center" },
  easeButtonActive: { backgroundColor: colors.sageDark },
  easeText: { color: colors.ink, fontWeight: "700" },
  easeTextActive: { color: "white" },
  easeLabels: { color: colors.inkSoft, fontSize: 10, marginTop: 7 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  stat: { width: "50%", paddingHorizontal: 5 },
  statValue: { color: colors.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.7 },
  weeklyChart: { flexDirection: "row", alignItems: "flex-end", minHeight: 126, gap: 6 },
  weeklyColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  weeklyTrack: { width: 26, height: 92, backgroundColor: "#F0F2ED", borderRadius: 10, overflow: "hidden", justifyContent: "flex-end" },
  weeklyBar: { width: "100%", backgroundColor: colors.sageDark, borderRadius: 10 },
  weeklyValue: { color: colors.inkSoft, fontSize: 9, fontWeight: "700", marginTop: 5 },
  weeklyLabel: { color: colors.inkSoft, fontSize: 10, marginTop: 2 },
  diaperLegend: { flexDirection: "row", gap: 14, marginBottom: 10 },
  diaperLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  diaperLegendDot: { width: 8, height: 8, borderRadius: 4 },
  diaperTrendRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  diaperTrendLabel: { color: colors.inkSoft, width: 34, fontSize: 11, textTransform: "capitalize" },
  diaperTrendTrack: { flex: 1, flexDirection: "row", height: 10, borderRadius: 6, overflow: "hidden", backgroundColor: "#F0F2ED", gap: 1 },
  diaperSegment: { height: "100%" },
  diaperWet: { backgroundColor: colors.sageDark },
  diaperDirty: { backgroundColor: colors.peach },
  diaperMixed: { backgroundColor: colors.lavender },
  diaperTrendCount: { color: colors.inkSoft, width: 24, textAlign: "right", fontSize: 11, fontWeight: "700" },
  measureRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  measure: { flex: 1 },
  measureValue: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  growthHistoryRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  growthChartBlock: { marginTop: 12 },
  growthChart: { height: 112, position: "relative", marginTop: 2 },
  growthGuide: { height: 1, position: "absolute", borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.line },
  growthGuideLabel: { position: "absolute", left: -28, top: -8, width: 24, color: colors.inkSoft, fontSize: 9 },
  growthLine: { position: "absolute", height: 2, backgroundColor: colors.sageDark },
  growthPoint: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sageDark, borderWidth: 1, borderColor: colors.paper },
  growthChartDates: { flexDirection: "row", justifyContent: "space-between", marginLeft: 28 },
  dualButtons: { flexDirection: "row", gap: 10, marginBottom: 14 },
  dualButton: { flex: 1 },
  taskDate: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  nav: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, borderRadius: 24, backgroundColor: "#FFFFFFF2", flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderColor: colors.line },
  navItem: { alignItems: "center", justifyContent: "center", minWidth: 54 },
  navGlyph: { color: colors.inkSoft, fontSize: 20, fontWeight: "600" },
  navLabel: { color: colors.inkSoft, fontSize: 10, marginTop: 4, fontWeight: "600" },
  navActive: { color: colors.sageDark, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(18,31,27,.34)" },
  sheet: { backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  quickSheet: { maxHeight: "78%" },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 4 },
  inputLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: "700", marginTop: 20, marginBottom: 7 },
  field: { marginBottom: 2 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 15, color: colors.ink, fontSize: 17 },
  noteInput: { height: 100, paddingTop: 14, textAlignVertical: "top", marginBottom: 14 },
  choiceRow: { flexDirection: "row", marginTop: 16, flexWrap: "wrap", rowGap: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  editLink: { color: colors.sageDark, fontSize: 13, fontWeight: "700" },
  timeFields: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  compactInput: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 12, marginTop: 6, color: colors.ink },
  dangerButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: "#E8C7C7", alignItems: "center", justifyContent: "center" },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
  linkText: { color: colors.sageDark, fontSize: 13, fontWeight: "700", marginTop: 8 },
  deleteButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#F7EEEE" },
  deleteText: { color: colors.danger, fontSize: 23, lineHeight: 25 },
  caregiverRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  caregiverAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  caregiverAvatarActive: { backgroundColor: colors.sageDark },
  activeAvatarText: { color: "white" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.sage },
  radioActive: { borderWidth: 6, borderColor: colors.sageDark },
  developmentItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  developmentOptions: { flexDirection: "row", gap: 6, marginTop: 8 },
  developmentOption: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 4, paddingVertical: 7, borderRadius: 12, backgroundColor: "#F0F2ED", alignItems: "center", justifyContent: "center" },
  developmentOptionActive: { backgroundColor: colors.sageDark },
  developmentOptionText: { color: colors.inkSoft, fontSize: 10, lineHeight: 13, fontWeight: "700", textAlign: "center" },
  developmentOptionTextActive: { color: "white" }
});
