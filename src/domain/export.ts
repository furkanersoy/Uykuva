import { AppState } from "./types";
import { migrateState } from "../data/migrations";

export function createDataExport(state: AppState) {
  return JSON.stringify({
    format: "uykuva-export",
    exportedAt: new Date().toISOString(),
    schemaVersion: state.schemaVersion,
    baby: state.baby,
    caregiverName: state.caregiverName,
    caregivers: state.caregivers,
    activeCaregiverId: state.activeCaregiverId,
    events: state.events,
    careTasks: state.careTasks,
    sleepPlan: state.sleepPlan,
    preferences: state.preferences
  }, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateString(value: unknown) {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year!, month! - 1, day!, 12);
  return parsed.getFullYear() === year && parsed.getMonth() === month! - 1 && parsed.getDate() === day;
}

function isClockString(value: unknown) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isCompletedPlanDayHistory(value: unknown) {
  return Array.isArray(value) && value.length <= 14 && value.every((item) =>
    isRecord(item) && typeof item.date === "string" && isDateOnly(item.date) &&
    typeof item.day === "number" && Number.isInteger(item.day) && item.day >= 1 && item.day <= 14 &&
    ["responsive", "gradual", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(item.method)) &&
    ["bedtime", "nightWakings", "naps", "routine"].includes(String(item.focus)) &&
    typeof item.completedTasks === "number" && Number.isInteger(item.completedTasks) && item.completedTasks >= 0 &&
    typeof item.totalTasks === "number" && Number.isInteger(item.totalTasks) && item.totalTasks >= item.completedTasks
  );
}

function isCompletedPlanRunHistory(value: unknown) {
  return Array.isArray(value) && value.length <= 10 && value.every((run) =>
    isRecord(run) && typeof run.id === "string" && typeof run.startDate === "string" && isDateOnly(run.startDate) &&
    typeof run.completedDate === "string" && isDateOnly(run.completedDate) && isCompletedPlanDayHistory(run.days)
  );
}

function isBreastSessions(value: unknown) {
  return value === undefined || Array.isArray(value) && value.every((session) =>
    isRecord(session) && ["left", "right"].includes(String(session.side)) && isDateString(session.startedAt) &&
    (session.endedAt === undefined || isDateString(session.endedAt))
  );
}

export function parseDataExport(raw: string): AppState {
  if (raw.length > 2_000_000) throw new Error("Yedek dosyası 2 MB sınırını aşıyor.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Metin geçerli bir JSON yedeği değil.");
  }
  if (!isRecord(parsed) || parsed.format !== "uykuva-export" || parsed.schemaVersion !== 3) {
    throw new Error("Bu dosya Uykuva'nın desteklenen yedek biçiminde değil.");
  }
  if (!isRecord(parsed.baby) || typeof parsed.baby.id !== "string" || typeof parsed.baby.name !== "string" || !parsed.baby.name.trim() || typeof parsed.baby.birthDate !== "string" || !isDateOnly(parsed.baby.birthDate) || typeof parsed.baby.gestationalWeek !== "number" || !Number.isInteger(parsed.baby.gestationalWeek) || parsed.baby.gestationalWeek < 22 || parsed.baby.gestationalWeek > 42) {
    throw new Error("Yedekte geçerli bir bebek profili bulunamadı.");
  }
  if (!Array.isArray(parsed.events) || !parsed.events.every((event) => isRecord(event) && typeof event.id === "string" && ["sleep", "feed", "diaper", "note", "health", "growth", "memory"].includes(String(event.kind)) && isDateString(event.startedAt) && typeof event.caregiver === "string" && (event.endedAt === undefined || isDateString(event.endedAt)) && (event.breastSessions === undefined || isBreastSessions(event.breastSessions)) && (event.memoryTitle === undefined || typeof event.memoryTitle === "string") && (event.milestoneId === undefined || typeof event.milestoneId === "string") && (event.feedType === undefined || ["breast", "bottle", "solid", "pump"].includes(String(event.feedType))) && (event.bottleSource === undefined || ["formula", "expressed"].includes(String(event.bottleSource))) && (event.milkStorageLocation === undefined || ["room", "fridge", "freezer"].includes(String(event.milkStorageLocation))) && (event.milkLabel === undefined || typeof event.milkLabel === "string") && (event.milkDiscardedAt === undefined || isDateString(event.milkDiscardedAt)) && (event.milkThawedAt === undefined || isDateString(event.milkThawedAt)) && (event.medicationReminderAt === undefined || isDateString(event.medicationReminderAt)))) {
    throw new Error("Yedekte okunamayan veya eksik bakım kayıtları var.");
  }
  if (!Array.isArray(parsed.careTasks) || !parsed.careTasks.every((task) => isRecord(task) && typeof task.id === "string" && ["vaccine", "appointment"].includes(String(task.type)) && typeof task.title === "string" && isDateString(task.dueAt) && (task.completedAt === undefined || isDateString(task.completedAt)) && (task.note === undefined || typeof task.note === "string") && (task.repeat === undefined || task.type === "appointment" && ["weekly", "monthly"].includes(String(task.repeat))) && (task.recurrenceId === undefined || typeof task.recurrenceId === "string") && (task.recurrenceDay === undefined || Number.isInteger(task.recurrenceDay) && Number(task.recurrenceDay) >= 1 && Number(task.recurrenceDay) <= 31) && (task.generated === undefined || typeof task.generated === "boolean"))) {
    throw new Error("Yedekte okunamayan aşı veya randevu kayıtları var.");
  }
  const plan = parsed.sleepPlan;
  if (!isRecord(plan) || (plan.paused !== undefined && typeof plan.paused !== "boolean") || (plan.lastAdvancedDate !== undefined && (typeof plan.lastAdvancedDate !== "string" || !isDateOnly(plan.lastAdvancedDate))) || (plan.completedDate !== undefined && (typeof plan.completedDate !== "string" || !isDateOnly(plan.completedDate))) || !["responsive", "gradual", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(plan.method)) || (plan.focus !== undefined && !["bedtime", "nightWakings", "naps", "routine"].includes(String(plan.focus))) || (plan.completedDays !== undefined && !isCompletedPlanDayHistory(plan.completedDays)) || (plan.completedRuns !== undefined && !isCompletedPlanRunHistory(plan.completedRuns)) || !isDateString(plan.startDate) || typeof plan.day !== "number" || !Number.isInteger(plan.day) || plan.day < 1 || plan.day > 14 || !isClockString(plan.bedtime) || !isClockString(plan.wakeTime) || !Array.isArray(plan.routine) || !plan.routine.every((step) => isRecord(step) && typeof step.id === "string" && typeof step.label === "string" && typeof step.enabled === "boolean" && typeof step.minutes === "number" && Number.isInteger(step.minutes) && step.minutes > 0) || !Array.isArray(plan.completedToday) || !plan.completedToday.every((item) => typeof item === "string") || !Array.isArray(plan.readinessCompleted) || !plan.readinessCompleted.every((item) => typeof item === "string") || !Array.isArray(plan.checkIns) || !plan.checkIns.every((item) => isRecord(item) && typeof item.date === "string" && (item.ease === undefined || [1, 2, 3, 4, 5].includes(Number(item.ease))) && (item.nightWakings === undefined || typeof item.nightWakings === "number" && Number.isInteger(item.nightWakings) && item.nightWakings >= 0 && item.nightWakings <= 5) && (item.bedtime === undefined || isClockString(item.bedtime)) && (item.wakeTime === undefined || isClockString(item.wakeTime)) && (item.note === undefined || typeof item.note === "string"))) {
    throw new Error("Uyku planı veya check-in kayıtları geçersiz.");
  }
  const preferences = parsed.preferences;
  if (!isRecord(preferences) || (preferences.handoffHours !== undefined && ![2, 4, 6, 8].includes(Number(preferences.handoffHours))) || typeof preferences.notificationsEnabled !== "boolean" || ![5, 10, 15, 20, 30].includes(Number(preferences.sleepReminderMinutes)) || typeof preferences.careTaskRemindersEnabled !== "boolean" || ![30, 120, 1440].includes(Number(preferences.careTaskReminderMinutes)) || (preferences.diaperRemindersEnabled !== undefined && typeof preferences.diaperRemindersEnabled !== "boolean") || (preferences.diaperReminderHours !== undefined && ![2, 3, 4].includes(Number(preferences.diaperReminderHours))) || !isClockString(preferences.quietStart) || !isClockString(preferences.quietEnd) || typeof parsed.caregiverName !== "string" || !Array.isArray(parsed.caregivers) || !parsed.caregivers.length || !parsed.caregivers.every((caregiver) => isRecord(caregiver) && typeof caregiver.id === "string" && typeof caregiver.name === "string" && ["parent", "family", "caregiver"].includes(String(caregiver.role)))) {
    throw new Error("Uyku planı veya tercih bilgileri eksik.");
  }
  return migrateState({ ...parsed, onboardingComplete: true });
}
