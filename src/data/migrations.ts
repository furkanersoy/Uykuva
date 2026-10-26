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
    careTasks: Array.isArray(candidate.careTasks) ? candidate.careTasks : [],
    sleepPlan: {
      ...initial.sleepPlan,
      ...candidate.sleepPlan,
      method: ["responsive", "gradual", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(candidate.sleepPlan?.method)) ? candidate.sleepPlan!.method! : initial.sleepPlan.method,
      paused: candidate.sleepPlan?.paused ?? false,
      routine: candidate.sleepPlan?.routine ?? initial.sleepPlan.routine,
      completedToday: candidate.sleepPlan?.completedToday ?? [],
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
