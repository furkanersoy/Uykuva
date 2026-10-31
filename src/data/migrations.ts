import { AppState, PregnancyActivity } from "../domain/types";
import { createInitialState } from "./seed";
import { DevelopmentCheckIn } from "../domain/types";

function isSleepPlanDayRecord(item: unknown) {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  return typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) && Number.isInteger(record.day) && Number(record.day) >= 1 && Number(record.day) <= 14 && ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(record.method)) && ["bedtime", "nightWakings", "naps", "routine", "earlyWaking"].includes(String(record.focus)) && Number.isInteger(record.completedTasks) && Number(record.completedTasks) >= 0 && Number.isInteger(record.totalTasks) && Number(record.totalTasks) >= Number(record.completedTasks);
}

function isDevelopmentCheckIn(item: unknown): item is DevelopmentCheckIn {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  const ageMonths = [2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60].includes(Number(record.ageMonths));
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

function migratedTombstoneIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 128))];
}

function migratePregnancyProfile(value: unknown): AppState["pregnancyProfile"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const profile = value as Record<string, unknown>;
  const updatedAt = typeof profile.updatedAt === "string" && Number.isFinite(new Date(profile.updatedAt).getTime()) ? profile.updatedAt : undefined;
  const rawDate = typeof profile.dueDate === "string" ? profile.dueDate : undefined;
  let dueDate: string | undefined;
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day) dueDate = rawDate;
  }
  const deleted = profile.deleted === true;
  if (!updatedAt || (!deleted && !dueDate)) return undefined;
  const activities = Array.isArray(profile.activities) ? profile.activities.flatMap((value): PregnancyActivity[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const activity = value as Record<string, unknown>;
    if (typeof activity.id !== "string" || !activity.id || activity.id.length > 128 || !["movement", "contraction"].includes(String(activity.kind)) || typeof activity.startedAt !== "string" || !Number.isFinite(new Date(activity.startedAt).getTime()) || typeof activity.updatedAt !== "string" || !Number.isFinite(new Date(activity.updatedAt).getTime()) || (activity.endedAt !== undefined && (typeof activity.endedAt !== "string" || !Number.isFinite(new Date(activity.endedAt).getTime()))) || (activity.deletedAt !== undefined && (typeof activity.deletedAt !== "string" || !Number.isFinite(new Date(activity.deletedAt).getTime()))) || (activity.movementCount !== undefined && (!Number.isInteger(activity.movementCount) || Number(activity.movementCount) < 0 || Number(activity.movementCount) > 100_000)) || (activity.kind === "movement" && activity.movementCount === undefined)) return [];
    const normalized: PregnancyActivity = { id: activity.id, kind: activity.kind as "movement" | "contraction", startedAt: activity.startedAt, updatedAt: activity.updatedAt };
    if (typeof activity.endedAt === "string") normalized.endedAt = activity.endedAt;
    if (typeof activity.movementCount === "number") normalized.movementCount = activity.movementCount;
    if (typeof activity.deletedAt === "string") normalized.deletedAt = activity.deletedAt;
    return [normalized];
  }).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-500) : undefined;
  return { dueDate, updatedAt, deleted, activities };
}

function migrateSingleState(value: unknown): AppState {
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
    ? candidate.sleepPlan!.completedRuns!.filter((run) => run && typeof run.id === "string" && typeof run.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.startDate) && typeof run.completedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.completedDate) && Array.isArray(run.days) && run.days.length <= 14 && run.days.every(isSleepPlanDayRecord))
    : [];
  const completedToday = Array.isArray(candidate.sleepPlan?.completedToday)
    ? candidate.sleepPlan!.completedToday!.filter((task): task is string => typeof task === "string" && task.length > 0 && task.length <= 300).slice(0, 50)
    : [];
  const completedTaskMarkedByValue = candidate.sleepPlan?.completedTaskMarkedBy;
  const completedTaskMarkedBy = completedTaskMarkedByValue && typeof completedTaskMarkedByValue === "object" && !Array.isArray(completedTaskMarkedByValue)
    ? Object.fromEntries(Object.entries(completedTaskMarkedByValue as Record<string, unknown>)
      .filter(([task, name]) => completedToday.includes(task) && task.length <= 300 && typeof name === "string" && name.trim().length > 0 && name.length <= 100)
      .slice(0, 50)) as Record<string, string>
    : {};
  const completedTaskUpdatedAtValue = candidate.sleepPlan?.completedTaskUpdatedAt;
  const completedTaskUpdatedAt = completedTaskUpdatedAtValue && typeof completedTaskUpdatedAtValue === "object" && !Array.isArray(completedTaskUpdatedAtValue)
    ? Object.fromEntries(Object.entries(completedTaskUpdatedAtValue as Record<string, unknown>)
      .filter(([task, updatedAt]) => task.length > 0 && task.length <= 300 && typeof updatedAt === "string" && Number.isFinite(new Date(updatedAt).getTime()))
      .slice(0, 50)) as Record<string, string>
    : {};
  const legacyRunStart = typeof candidate.sleepPlan?.startDate === "string" ? localDateOnly(candidate.sleepPlan.startDate) : undefined;
  const legacyCompletedDate = typeof candidate.sleepPlan?.completedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.sleepPlan.completedDate) ? candidate.sleepPlan.completedDate : undefined;
  if (legacyCompletedDate && legacyRunStart && completedDays.some((day) => day.date >= legacyRunStart) && !completedRuns.some((run) => run.completedDate === legacyCompletedDate)) {
    completedRuns.push({ id: `legacy-sleep-run-${legacyCompletedDate}`, startDate: legacyRunStart, completedDate: legacyCompletedDate, days: completedDays.filter((day) => day.date >= legacyRunStart) });
  }
  return {
    ...initial,
    ...candidate,
    schemaVersion: 8,
    pregnancyProfile: migratePregnancyProfile(candidate.pregnancyProfile),
    onboardingComplete: candidate.onboardingComplete ?? true,
    baby: {
      ...initial.baby,
      ...candidate.baby,
      growthChartSex: candidate.baby?.growthChartSex === "female" || candidate.baby?.growthChartSex === "male" ? candidate.baby.growthChartSex : undefined
    },
    caregiverName,
    careInstructions: typeof candidate.careInstructions === "string" ? candidate.careInstructions.slice(0, 1000) : "",
    syncTombstones: {
      eventIds: migratedTombstoneIds(candidate.syncTombstones?.eventIds),
      careTaskIds: migratedTombstoneIds(candidate.syncTombstones?.careTaskIds),
      nightWakeLogIds: migratedTombstoneIds(candidate.syncTombstones?.nightWakeLogIds),
      childIds: migratedTombstoneIds(candidate.syncTombstones?.childIds),
      caregiverIds: migratedTombstoneIds(candidate.syncTombstones?.caregiverIds)
    },
    developmentCheckIns: Array.isArray(candidate.developmentCheckIns) ? candidate.developmentCheckIns.filter(isDevelopmentCheckIn).slice(-12) : [],
    caregivers,
    activeCaregiverId: caregivers.some((item) => item.id === candidate.activeCaregiverId) ? candidate.activeCaregiverId! : caregivers[0]!.id,
    events: Array.isArray(candidate.events) ? candidate.events : initial.events,
    careTasks: Array.isArray(candidate.careTasks) ? candidate.careTasks.map((task) => {
      const repeat = task.type === "appointment" && ["weekly", "monthly"].includes(String(task.repeat)) ? task.repeat : undefined;
      const date = new Date(task.dueAt);
      const assignedCaregiverId = caregivers.some((caregiver) => caregiver.id === task.assignedCaregiverId) ? task.assignedCaregiverId : undefined;
      return { ...task, assignedCaregiverId, repeat, recurrenceId: repeat ? task.recurrenceId || `recurrence-${task.id}` : undefined, recurrenceDay: repeat ? Number.isInteger(task.recurrenceDay) && task.recurrenceDay! >= 1 && task.recurrenceDay! <= 31 ? task.recurrenceDay : date.getDate() : undefined, generated: repeat ? task.generated === true : undefined };
    }) : [],
    sleepPlan: {
      ...initial.sleepPlan,
      ...candidate.sleepPlan,
      method: ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(candidate.sleepPlan?.method)) ? candidate.sleepPlan!.method! : initial.sleepPlan.method,
      focus: ["bedtime", "nightWakings", "naps", "routine", "earlyWaking"].includes(String(candidate.sleepPlan?.focus)) ? candidate.sleepPlan!.focus! : initial.sleepPlan.focus,
      paused: candidate.sleepPlan?.paused ?? false,
      routine: candidate.sleepPlan?.routine ?? initial.sleepPlan.routine,
      completedToday,
      completedTaskMarkedBy,
      completedTaskUpdatedAt,
      completedDays,
      completedRuns,
      readinessCompleted: candidate.sleepPlan?.readinessCompleted ?? [],
      savedGuideIds: Array.isArray(candidate.sleepPlan?.savedGuideIds)
        ? [...new Set(candidate.sleepPlan.savedGuideIds.filter((value): value is string => typeof value === "string" && value.length > 0 && value.length <= 100))].slice(0, 100)
        : [],
      checkIns: Array.isArray(candidate.sleepPlan?.checkIns) ? candidate.sleepPlan.checkIns.map((item) => ({
        ...item,
        appliedMethod: ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(item.appliedMethod)) ? item.appliedMethod : undefined,
        sustainability: [1, 2, 3, 4, 5].includes(Number(item.sustainability)) ? Number(item.sustainability) as NonNullable<AppState["sleepPlan"]["checkIns"][number]["sustainability"]> : undefined,
        planReflection: typeof item.planReflection === "string" ? item.planReflection.slice(0, 300) : undefined,
        dayContext: ["illness", "travel", "teething", "routineChange"].includes(String(item.dayContext)) ? item.dayContext : undefined
      })) : []
    },
    preferences: {
      ...initial.preferences,
      ...candidate.preferences,
      handoffHours: [2, 4, 6, 8].includes(Number(candidate.preferences?.handoffHours)) ? Number(candidate.preferences?.handoffHours) as 2 | 4 | 6 | 8 : 4,
      wakeReminderEnabled: candidate.preferences?.wakeReminderEnabled === true,
      wakeReminderMinutes: [5, 10, 15, 20, 30].includes(Number(candidate.preferences?.wakeReminderMinutes)) ? Number(candidate.preferences?.wakeReminderMinutes) as 5 | 10 | 15 | 20 | 30 : 10,
      careTaskRemindersEnabled: candidate.preferences?.careTaskRemindersEnabled ?? false,
      careTaskReminderMinutes: candidate.preferences?.careTaskReminderMinutes ?? 120,
      diaperRemindersEnabled: candidate.preferences?.diaperRemindersEnabled ?? false,
      diaperReminderHours: [2, 3, 4].includes(Number(candidate.preferences?.diaperReminderHours)) ? Number(candidate.preferences?.diaperReminderHours) as 2 | 3 | 4 : 3,
      milkExpiryRemindersEnabled: candidate.preferences?.milkExpiryRemindersEnabled ?? false,
      milkExpiryReminderLead: ["adaptive", 2, 6, 12, 24, 48].includes(candidate.preferences?.milkExpiryReminderLead as never) ? candidate.preferences?.milkExpiryReminderLead as AppState["preferences"]["milkExpiryReminderLead"] : "adaptive",
      routineRemindersEnabled: candidate.preferences?.routineRemindersEnabled ?? false
    }
  };
}

function childProfileFromState(state: AppState) {
  return {
    baby: state.baby,
    careInstructions: state.careInstructions,
    developmentCheckIns: state.developmentCheckIns,
    events: state.events,
    careTasks: state.careTasks,
    sleepPlan: state.sleepPlan
  };
}

export function migrateState(value: unknown): AppState {
  const base = migrateSingleState(value);
  if (!value || typeof value !== "object") return base;
  const candidate = value as Partial<AppState>;
  const seenBabyIds = new Set<string>();
  const profiles = Array.isArray(candidate.children) ? candidate.children.flatMap((profile) => {
    if (!profile || typeof profile !== "object" || !profile.baby || typeof profile.baby.id !== "string" || !profile.baby.id || typeof profile.baby.name !== "string" || !profile.baby.name.trim() || seenBabyIds.has(profile.baby.id)) return [];
    seenBabyIds.add(profile.baby.id);
    const migrated = migrateSingleState({
      ...base,
      ...profile,
      onboardingComplete: base.onboardingComplete,
      caregivers: base.caregivers,
      activeCaregiverId: base.activeCaregiverId,
      caregiverName: base.caregiverName,
      preferences: base.preferences
    });
    return [childProfileFromState(migrated)];
  }) : [];
  if (!profiles.length) profiles.push(childProfileFromState(base));

  const requestedActiveId = typeof candidate.activeChildId === "string" ? candidate.activeChildId : base.baby.id;
  const active = profiles.find((profile) => profile.baby.id === requestedActiveId) ?? profiles.find((profile) => profile.baby.id === base.baby.id) ?? profiles[0]!;
  return {
    ...base,
    baby: active.baby,
    careInstructions: active.careInstructions,
    developmentCheckIns: active.developmentCheckIns,
    events: active.events,
    careTasks: active.careTasks,
    sleepPlan: active.sleepPlan,
    children: profiles,
    activeChildId: active.baby.id
  };
}
