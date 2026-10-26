import { AppState } from "../domain/types";
import { createInitialState } from "./seed";

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
      completedDays: Array.isArray(candidate.sleepPlan?.completedDays)
        ? candidate.sleepPlan!.completedDays!.filter((item) => item && typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isInteger(item.day) && item.day >= 1 && item.day <= 14 && ["responsive", "gradual", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(item.method) && ["bedtime", "nightWakings", "naps", "routine"].includes(item.focus) && Number.isInteger(item.completedTasks) && item.completedTasks >= 0 && Number.isInteger(item.totalTasks) && item.totalTasks >= item.completedTasks).slice(-14)
        : [],
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
