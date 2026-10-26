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
    baby: { ...initial.baby, ...candidate.baby },
    caregiverName,
    caregivers,
    activeCaregiverId: caregivers.some((item) => item.id === candidate.activeCaregiverId) ? candidate.activeCaregiverId! : caregivers[0]!.id,
    events: Array.isArray(candidate.events) ? candidate.events : initial.events,
    careTasks: Array.isArray(candidate.careTasks) ? candidate.careTasks : [],
    sleepPlan: {
      ...initial.sleepPlan,
      ...candidate.sleepPlan,
      routine: candidate.sleepPlan?.routine ?? initial.sleepPlan.routine,
      completedToday: candidate.sleepPlan?.completedToday ?? [],
      readinessCompleted: candidate.sleepPlan?.readinessCompleted ?? [],
      checkIns: candidate.sleepPlan?.checkIns ?? []
    },
    preferences: { ...initial.preferences, ...candidate.preferences }
  };
}

