import { AppState } from "../domain/types";
import { createInitialState } from "./seed";
import { DevelopmentCheckIn } from "../domain/types";

function isSleepPlanDayRecord(item: unknown) {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  return typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) && Number.isInteger(record.day) && Number(record.day) >= 1 && Number(record.day) <= 14 && ["responsive", "gradual", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(record.method)) && ["bedtime", "nightWakings", "naps", "routine"].includes(String(record.focus)) && Number.isInteger(record.completedTasks) && Number(record.completedTasks) >= 0 && Number.isInteger(record.totalTasks) && Number(record.totalTasks) >= Number(record.completedTasks);
}

function isDevelopmentCheckIn(item: unknown): item is DevelopmentCheckIn {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  const ageMonths = [2, 4, 6, 9, 12, 15, 18].includes(Number(record.ageMonths));
  const answers = record.answers;
  return ageMonths && typeof record.checkedAt === "string" && Number.isFinite(new Date(record.checkedAt).getTime()) &&
    !!answers && typeof answers === "object" && !Array.isArray(answers) && Object.values(answers).every((answer) => ["yes", "notSure", "notYet"].includes(String(answer))) &&
    (record.note === undefined || typeof record.note === "string");
}

function localDateOnly(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function migrateState(value: unknown): AppState {
  const initial = createInitialState();
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<AppState>;
  const legacyName = candidate.caregiverName?.trim() || initial.caregiverName;
  const storedCaregivers: AppState["caregivers"] = Array.isArray(candidate.caregivers)
    ? candidate.caregivers.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && ["parent", "family", "caregiver"].includes(item.role))
    : [];
  const caregivers = storedCaregivers.length ? storedCaregivers : [{ id: "caregiver-1", name: legacyName, role: "parent" as const }];
  const activeCaregiverId = caregivers.some((item) => item.id === candidate.activeCaregiverId) ? candidate.activeCaregiverId! : caregivers[0]!.id;
  const caregiverName = caregivers.find((item) => item.id === activeCaregiverId)?.name ?? legacyName;
  const completedDays = Array.isArray(candidate.sleepPlan?.completedDays) ? candidate.sleepPlan!.completedDays!.filter(isSleepPlanDayRecord).slice(-14) : [];
  const completedRuns = Array.isArray(candidate.sleepPlan?.completedRuns)
    ? candidate.sleepPlan!.completedRuns!.filter((run) => run && typeof run.id === "string" && typeof run.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.startDate) && typeof run.completedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.completedDate) && Array.isArray(run.days) && run.days.length <= 14 && run.days.every(isSleepPlanDayRecord)).slice(-10)
    : [];
  const legacyRunStart = typeof candidate.sleepPlan?.startDate === "string" ? localDateOnly(candidate.sleepPlan.startDate) : undefined;
  const legacyCompletedDate = typeof candidate.sleepPlan?.completedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.sleepPlan.completedDate) ? candidate.sleepPlan.completedDate : undefined;
  if (legacyCompletedDate && legacyRunStart && completedDays.some((day) => day.date >= legacyRunStart) && !completedRuns.some((run) => run.completedDate === legacyCompletedDate)) {
    completedRuns.push({ id: `legacy-sleep-run-${legacyCompletedDate}`, startDate: legacyRunStart, completedDate: legacyCompletedDate, days: completedDays.filter((day) => day.date >= legacyRunStart) });
  }
  return {
    ...initial,
    ...candidate,
    schemaVersion: 3,
    onboardingComplete: candidate.onboardingComplete ?? true,
    baby: {
      ...initial.baby,
      ...candidate.baby,
      growthChartSex: candidate.baby?.growthChartSex === "female" || candidate.baby?.growthChartSex === "male" ? candidate.baby.growthChartSex : undefined
    },
    caregiverName,
    careInstructions: typeof candidate.careInstructions === "string" ? candidate.careInstructions.slice(0, 1000) : "",
    developmentCheckIns: Array.isArray(candidate.developmentCheckIns) ? candidate.developmentCheckIns.filter(isDevelopmentCheckIn).slice(-7) : [],
    caregivers,
    activeCaregiverId: caregivers.some((item) => item.id === candidate.activeCaregiverId) ? candidate.activeCaregiverId! : caregivers[0]!.id,
    events: Array.isArray(candidate.events) ? candidate.events : initial.events,
    careTasks: Array.isArray(candidate.careTasks) ? candidate.careTasks.map((task) => {
      const repeat = task.type === "appointment" && ["weekly", "monthly"].includes(String(task.repeat)) ? task.repeat : undefined;
      const date = new Date(task.dueAt);
      return { ...task, repeat, recurrenceId: repeat ? task.recurrenceId || `recurrence-${task.id}` : undefined, recurrenceDay: repeat ? Number.isInteger(task.recurrenceDay) && task.recurrenceDay! >= 1 && task.recurrenceDay! <= 31 ? task.recurrenceDay : date.getDate() : undefined, generated: repeat ? task.generated === true : undefined };
    }) : [],
    sleepPlan: {
      ...initial.sleepPlan,
      ...candidate.sleepPlan,
      method: ["responsive", "gradual", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(candidate.sleepPlan?.method)) ? candidate.sleepPlan!.method! : initial.sleepPlan.method,
      focus: ["bedtime", "nightWakings", "naps", "routine"].includes(String(candidate.sleepPlan?.focus)) ? candidate.sleepPlan!.focus! : initial.sleepPlan.focus,
      paused: candidate.sleepPlan?.paused ?? false,
      routine: candidate.sleepPlan?.routine ?? initial.sleepPlan.routine,
      completedToday: candidate.sleepPlan?.completedToday ?? [],
      completedDays,
      completedRuns: completedRuns.slice(-10),
      readinessCompleted: candidate.sleepPlan?.readinessCompleted ?? [],
      checkIns: candidate.sleepPlan?.checkIns ?? []
    },
    preferences: {
      ...initial.preferences,
      ...candidate.preferences,
      handoffHours: [2, 4, 6, 8].includes(Number(candidate.preferences?.handoffHours)) ? Number(candidate.preferences?.handoffHours) as 2 | 4 | 6 | 8 : 4,
      careTaskRemindersEnabled: candidate.preferences?.careTaskRemindersEnabled ?? false,
      careTaskReminderMinutes: candidate.preferences?.careTaskReminderMinutes ?? 120,
      diaperRemindersEnabled: candidate.preferences?.diaperRemindersEnabled ?? false,
      diaperReminderHours: [2, 3, 4].includes(Number(candidate.preferences?.diaperReminderHours)) ? Number(candidate.preferences?.diaperReminderHours) as 2 | 3 | 4 : 3
    }
  };
}

