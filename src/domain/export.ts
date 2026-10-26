import { AppState } from "./types";

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

