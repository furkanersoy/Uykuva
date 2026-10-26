import { AppState } from "../domain/types";
import { createInitialState } from "./seed";

export function migrateState(value: unknown): AppState {
  const initial = createInitialState();
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<AppState>;
  return {
    ...initial,
    ...candidate,
    schemaVersion: 2,
    onboardingComplete: candidate.onboardingComplete ?? true,
    baby: { ...initial.baby, ...candidate.baby },
    events: Array.isArray(candidate.events) ? candidate.events : initial.events,
    sleepPlan: {
      ...initial.sleepPlan,
      ...candidate.sleepPlan,
      routine: candidate.sleepPlan?.routine ?? initial.sleepPlan.routine,
      completedToday: candidate.sleepPlan?.completedToday ?? [],
      checkIns: candidate.sleepPlan?.checkIns ?? []
    },
    preferences: { ...initial.preferences, ...candidate.preferences }
  };
}
