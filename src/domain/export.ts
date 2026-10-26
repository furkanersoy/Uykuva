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
  if (!Array.isArray(parsed.events) || !parsed.events.every((event) => isRecord(event) && typeof event.id === "string" && ["sleep", "feed", "diaper", "note", "health", "growth"].includes(String(event.kind)) && isDateString(event.startedAt) && typeof event.caregiver === "string" && (event.endedAt === undefined || isDateString(event.endedAt)) && (event.feedType === undefined || ["breast", "bottle", "solid", "pump"].includes(String(event.feedType))) && (event.bottleSource === undefined || ["formula", "expressed"].includes(String(event.bottleSource))) && (event.milkStorageLocation === undefined || ["room", "fridge", "freezer"].includes(String(event.milkStorageLocation))) && (event.milkLabel === undefined || typeof event.milkLabel === "string") && (event.milkDiscardedAt === undefined || isDateString(event.milkDiscardedAt)) && (event.milkThawedAt === undefined || isDateString(event.milkThawedAt)))) {
    throw new Error("Yedekte okunamayan veya eksik bakım kayıtları var.");
  }
  if (!Array.isArray(parsed.careTasks) || !parsed.careTasks.every((task) => isRecord(task) && typeof task.id === "string" && ["vaccine", "appointment"].includes(String(task.type)) && typeof task.title === "string" && isDateString(task.dueAt))) {
    throw new Error("Yedekte okunamayan aşı veya randevu kayıtları var.");
  }
  const plan = parsed.sleepPlan;
  if (!isRecord(plan) || !["responsive", "gradual", "camping"].includes(String(plan.method)) || !isDateString(plan.startDate) || typeof plan.day !== "number" || !Number.isInteger(plan.day) || plan.day < 1 || plan.day > 14 || !isClockString(plan.bedtime) || !isClockString(plan.wakeTime) || !Array.isArray(plan.routine) || !plan.routine.every((step) => isRecord(step) && typeof step.id === "string" && typeof step.label === "string" && typeof step.enabled === "boolean" && typeof step.minutes === "number" && Number.isInteger(step.minutes) && step.minutes > 0) || !Array.isArray(plan.completedToday) || !plan.completedToday.every((item) => typeof item === "string") || !Array.isArray(plan.readinessCompleted) || !plan.readinessCompleted.every((item) => typeof item === "string") || !Array.isArray(plan.checkIns) || !plan.checkIns.every((item) => isRecord(item) && typeof item.date === "string" && (item.ease === undefined || [1, 2, 3, 4, 5].includes(Number(item.ease))) && (item.nightWakings === undefined || typeof item.nightWakings === "number" && Number.isInteger(item.nightWakings) && item.nightWakings >= 0 && item.nightWakings <= 5) && (item.note === undefined || typeof item.note === "string"))) {
    throw new Error("Uyku planı veya check-in kayıtları geçersiz.");
  }
  const preferences = parsed.preferences;
  if (!isRecord(preferences) || typeof preferences.notificationsEnabled !== "boolean" || ![5, 10, 15, 20, 30].includes(Number(preferences.sleepReminderMinutes)) || typeof preferences.careTaskRemindersEnabled !== "boolean" || ![30, 120, 1440].includes(Number(preferences.careTaskReminderMinutes)) || !isClockString(preferences.quietStart) || !isClockString(preferences.quietEnd) || typeof parsed.caregiverName !== "string" || !Array.isArray(parsed.caregivers) || !parsed.caregivers.length || !parsed.caregivers.every((caregiver) => isRecord(caregiver) && typeof caregiver.id === "string" && typeof caregiver.name === "string" && ["parent", "family", "caregiver"].includes(String(caregiver.role)))) {
    throw new Error("Uyku planı veya tercih bilgileri eksik.");
  }
  return migrateState({ ...parsed, onboardingComplete: true });
}
