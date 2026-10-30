import { AppState, SyncTombstones } from "./types";
import { migrateState } from "../data/migrations";

export function createDataExport(state: AppState) {
  const activeChild = { baby: state.baby, careInstructions: state.careInstructions, developmentCheckIns: state.developmentCheckIns, events: state.events, careTasks: state.careTasks, sleepPlan: state.sleepPlan };
  const children = state.children.map((child) => child.baby.id === state.activeChildId ? activeChild : child);
  return JSON.stringify({
    format: "uykuva-export",
    exportedAt: new Date().toISOString(),
    schemaVersion: state.schemaVersion,
    baby: state.baby,
    caregiverName: state.caregiverName,
    careInstructions: state.careInstructions ?? "",
    developmentCheckIns: state.developmentCheckIns ?? [],
    caregivers: state.caregivers,
    activeCaregiverId: state.activeCaregiverId,
    events: state.events,
    careTasks: state.careTasks,
    sleepPlan: state.sleepPlan,
    preferences: state.preferences,
    children,
    activeChildId: state.activeChildId,
    syncTombstones: state.syncTombstones
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
    ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(item.method)) &&
    ["bedtime", "nightWakings", "naps", "routine"].includes(String(item.focus)) &&
    typeof item.completedTasks === "number" && Number.isInteger(item.completedTasks) && item.completedTasks >= 0 &&
    typeof item.totalTasks === "number" && Number.isInteger(item.totalTasks) && item.totalTasks >= item.completedTasks
  );
}

function isCompletedPlanRunHistory(value: unknown) {
  return Array.isArray(value) && value.every((run) =>
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

function isNightWakeLog(value: unknown) {
  return isRecord(value) && typeof value.id === "string" && isDateString(value.at) &&
    ["feeding", "comfort", "diaper", "other"].includes(String(value.response)) && typeof value.caregiver === "string";
}

function isSleepDayContext(value: unknown) {
  return ["illness", "travel", "teething", "routineChange"].includes(String(value));
}

function isSyncTombstones(value: unknown): value is SyncTombstones {
  if (!isRecord(value)) return false;
  return (["eventIds", "careTaskIds", "nightWakeLogIds", "childIds", "caregiverIds"] as const).every((key) =>
    Array.isArray(value[key]) && value[key].length <= 50_000 && value[key].every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)
  );
}

export function parseDataExport(raw: string): AppState {
  if (raw.length > 12_000_000) throw new Error("Yedek dosyası 12 MB sınırını aşıyor.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Metin geçerli bir JSON yedeği değil.");
  }
  if (!isRecord(parsed) || parsed.format !== "uykuva-export" || ![3, 4, 5, 6].includes(Number(parsed.schemaVersion))) {
    throw new Error("Bu dosya Uykuva'nın desteklenen yedek biçiminde değil.");
  }
  if (parsed.syncTombstones !== undefined && !isSyncTombstones(parsed.syncTombstones)) {
    throw new Error("Yedekteki eşitleme silme kayıtları geçersiz.");
  }
  if (!isRecord(parsed.baby) || typeof parsed.baby.id !== "string" || typeof parsed.baby.name !== "string" || !parsed.baby.name.trim() || typeof parsed.baby.birthDate !== "string" || !isDateOnly(parsed.baby.birthDate) || typeof parsed.baby.gestationalWeek !== "number" || !Number.isInteger(parsed.baby.gestationalWeek) || parsed.baby.gestationalWeek < 22 || parsed.baby.gestationalWeek > 42) {
    throw new Error("Yedekte geçerli bir bebek profili bulunamadı.");
  }
  if (!Array.isArray(parsed.events) || !parsed.events.every((event) => isRecord(event) && typeof event.id === "string" && ["sleep", "feed", "diaper", "note", "health", "growth", "memory"].includes(String(event.kind)) && isDateString(event.startedAt) && typeof event.caregiver === "string" && (event.endedAt === undefined || isDateString(event.endedAt)) && (event.sleepSupport === undefined || ["feeding", "held", "rocked", "nearby", "cribSupport", "independent", "other"].includes(String(event.sleepSupport))) && (event.breastSessions === undefined || isBreastSessions(event.breastSessions)) && (event.memoryTitle === undefined || typeof event.memoryTitle === "string") && (event.memoryPhotoData === undefined || event.kind === "memory" && typeof event.memoryPhotoData === "string" && event.memoryPhotoData.length <= 1_100_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(event.memoryPhotoData)) && (event.milestoneId === undefined || typeof event.milestoneId === "string") && (event.feedType === undefined || ["breast", "bottle", "solid", "pump"].includes(String(event.feedType))) && (event.bottleSource === undefined || ["formula", "expressed"].includes(String(event.bottleSource))) && (event.milkStorageLocation === undefined || ["room", "fridge", "freezer"].includes(String(event.milkStorageLocation))) && (event.milkLabel === undefined || typeof event.milkLabel === "string") && (event.milkDiscardedAt === undefined || isDateString(event.milkDiscardedAt)) && (event.milkThawedAt === undefined || isDateString(event.milkThawedAt)) && (event.milkWarmedAt === undefined || isDateString(event.milkWarmedAt)) && (event.medicationReminderAt === undefined || isDateString(event.medicationReminderAt)))) {
    throw new Error("Yedekte okunamayan veya eksik bakım kayıtları var.");
  }
  if (!Array.isArray(parsed.careTasks) || !parsed.careTasks.every((task) => isRecord(task) && typeof task.id === "string" && ["vaccine", "appointment"].includes(String(task.type)) && typeof task.title === "string" && isDateString(task.dueAt) && (task.completedAt === undefined || isDateString(task.completedAt)) && (task.note === undefined || typeof task.note === "string") && (task.assignedCaregiverId === undefined || typeof task.assignedCaregiverId === "string" && task.assignedCaregiverId.length > 0 && task.assignedCaregiverId.length <= 100) && (task.repeat === undefined || task.type === "appointment" && ["weekly", "monthly"].includes(String(task.repeat))) && (task.recurrenceId === undefined || typeof task.recurrenceId === "string") && (task.recurrenceDay === undefined || Number.isInteger(task.recurrenceDay) && Number(task.recurrenceDay) >= 1 && Number(task.recurrenceDay) <= 31) && (task.generated === undefined || typeof task.generated === "boolean"))) {
    throw new Error("Yedekte okunamayan aşı veya randevu kayıtları var.");
  }
  const plan = parsed.sleepPlan;
  if (!isRecord(plan) || (plan.savedGuideIds !== undefined && (!Array.isArray(plan.savedGuideIds) || plan.savedGuideIds.length > 100 || !plan.savedGuideIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 100))) || (plan.paused !== undefined && typeof plan.paused !== "boolean") || (plan.lastAdvancedDate !== undefined && (typeof plan.lastAdvancedDate !== "string" || !isDateOnly(plan.lastAdvancedDate))) || (plan.completedDate !== undefined && (typeof plan.completedDate !== "string" || !isDateOnly(plan.completedDate))) || !["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(plan.method)) || (plan.focus !== undefined && !["bedtime", "nightWakings", "naps", "routine"].includes(String(plan.focus))) || (plan.completedDays !== undefined && !isCompletedPlanDayHistory(plan.completedDays)) || (plan.completedRuns !== undefined && !isCompletedPlanRunHistory(plan.completedRuns)) || !isDateString(plan.startDate) || typeof plan.day !== "number" || !Number.isInteger(plan.day) || plan.day < 1 || plan.day > 14 || !isClockString(plan.bedtime) || !isClockString(plan.wakeTime) || !Array.isArray(plan.routine) || !plan.routine.every((step) => isRecord(step) && typeof step.id === "string" && typeof step.label === "string" && typeof step.enabled === "boolean" && typeof step.minutes === "number" && Number.isInteger(step.minutes) && step.minutes > 0) || !Array.isArray(plan.completedToday) || !plan.completedToday.every((item) => typeof item === "string") || !Array.isArray(plan.readinessCompleted) || !plan.readinessCompleted.every((item) => typeof item === "string") || !Array.isArray(plan.checkIns) || !plan.checkIns.every((item) => isRecord(item) && typeof item.date === "string" && (item.ease === undefined || [1, 2, 3, 4, 5].includes(Number(item.ease))) && (item.sustainability === undefined || [1, 2, 3, 4, 5].includes(Number(item.sustainability))) && (item.planReflection === undefined || typeof item.planReflection === "string" && item.planReflection.length <= 300) && (item.nightWakings === undefined || typeof item.nightWakings === "number" && Number.isInteger(item.nightWakings) && item.nightWakings >= 0 && item.nightWakings <= 5) && (item.bedtime === undefined || isClockString(item.bedtime)) && (item.wakeTime === undefined || isClockString(item.wakeTime)) && (item.appliedMethod === undefined || ["responsive", "gradual", "timedChecks", "camping", "bedtimeFading", "pickUpPutDown", "routineFirst"].includes(String(item.appliedMethod))) && (item.dayContext === undefined || isSleepDayContext(item.dayContext)) && (item.nightWakeLogs === undefined || Array.isArray(item.nightWakeLogs) && item.nightWakeLogs.length <= 30 && item.nightWakeLogs.every(isNightWakeLog)) && (item.note === undefined || typeof item.note === "string"))) {
    throw new Error("Uyku planı veya check-in kayıtları geçersiz.");
  }
  const preferences = parsed.preferences;
  const developmentCheckIns = parsed.developmentCheckIns;
  if (developmentCheckIns !== undefined && (!Array.isArray(developmentCheckIns) || developmentCheckIns.length > 12 || !developmentCheckIns.every((item) => isRecord(item) && [2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60].includes(Number(item.ageMonths)) && isDateString(item.checkedAt) && isRecord(item.answers) && Object.values(item.answers).every((answer) => ["yes", "notSure", "notYet"].includes(String(answer))) && (item.note === undefined || typeof item.note === "string" && item.note.length <= 500)))) {
    throw new Error("Gelişim gözlemi yedek kaydı geçersiz.");
  }
  if (!isRecord(preferences) || (preferences.handoffHours !== undefined && ![2, 4, 6, 8].includes(Number(preferences.handoffHours))) || typeof preferences.notificationsEnabled !== "boolean" || ![5, 10, 15, 20, 30].includes(Number(preferences.sleepReminderMinutes)) || typeof preferences.careTaskRemindersEnabled !== "boolean" || ![15, 30, 60, 120, 180, 1440].includes(Number(preferences.careTaskReminderMinutes)) || (preferences.diaperRemindersEnabled !== undefined && typeof preferences.diaperRemindersEnabled !== "boolean") || (preferences.diaperReminderHours !== undefined && ![2, 3, 4].includes(Number(preferences.diaperReminderHours))) || (preferences.milkExpiryRemindersEnabled !== undefined && typeof preferences.milkExpiryRemindersEnabled !== "boolean") || (preferences.milkExpiryReminderLead !== undefined && !["adaptive", "2", "6", "12", "24", "48"].includes(String(preferences.milkExpiryReminderLead))) || !isClockString(preferences.quietStart) || !isClockString(preferences.quietEnd) || typeof parsed.caregiverName !== "string" || (parsed.careInstructions !== undefined && (typeof parsed.careInstructions !== "string" || parsed.careInstructions.length > 1000)) || !Array.isArray(parsed.caregivers) || !parsed.caregivers.length || !parsed.caregivers.every((caregiver) => isRecord(caregiver) && typeof caregiver.id === "string" && typeof caregiver.name === "string" && ["parent", "family", "caregiver"].includes(String(caregiver.role)))) {
    throw new Error("Uyku planı veya tercih bilgileri eksik.");
  }
  if ((preferences.wakeReminderEnabled !== undefined && typeof preferences.wakeReminderEnabled !== "boolean") || (preferences.wakeReminderMinutes !== undefined && ![5, 10, 15, 20, 30].includes(Number(preferences.wakeReminderMinutes)))) {
    throw new Error("Uyanma hatırlatması tercihleri geçersiz.");
  }
  let children: AppState["children"] | undefined;
  if (parsed.children !== undefined) {
    if (!Array.isArray(parsed.children)) throw new Error("Yedekteki çocuk profili sayısı geçersiz.");
    children = parsed.children.map((profile) => {
      if (!isRecord(profile) || !isRecord(profile.baby)) throw new Error("Yedekte bir çocuk profili geçersiz.");
      const childState = parseDataExport(JSON.stringify({ ...parsed, ...profile, children: undefined, activeChildId: profile.baby.id }));
      return { baby: childState.baby, careInstructions: childState.careInstructions, developmentCheckIns: childState.developmentCheckIns, events: childState.events, careTasks: childState.careTasks, sleepPlan: childState.sleepPlan };
    });
  }
  return migrateState({ ...parsed, ...(children ? { children } : {}), onboardingComplete: true });
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[], merge?: (current: T, incoming: T) => T): T[] {
  const rows = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = rows.get(item.id);
    rows.set(item.id, previous && merge ? merge(previous, item) : previous ? { ...previous, ...item } : item);
  }
  return [...rows.values()];
}

export function mergeSyncTombstones(current: SyncTombstones, incoming: SyncTombstones): SyncTombstones {
  return {
    eventIds: [...new Set([...current.eventIds, ...incoming.eventIds])],
    careTaskIds: [...new Set([...current.careTaskIds, ...incoming.careTaskIds])],
    nightWakeLogIds: [...new Set([...current.nightWakeLogIds, ...incoming.nightWakeLogIds])],
    childIds: [...new Set([...current.childIds, ...incoming.childIds])],
    caregiverIds: [...new Set([...current.caregiverIds, ...incoming.caregiverIds])]
  };
}

function mergeCheckIns(current: AppState["sleepPlan"]["checkIns"], incoming: AppState["sleepPlan"]["checkIns"], deletedLogIds: Set<string>) {
  const byDate = new Map(current.map((item) => [item.date, item]));
  for (const item of incoming) {
    const previous = byDate.get(item.date);
    if (!previous) {
      byDate.set(item.date, { ...item, nightWakeLogs: item.nightWakeLogs?.filter((log) => !deletedLogIds.has(log.id)) });
      continue;
    }
    const logs = mergeById(previous.nightWakeLogs ?? [], item.nightWakeLogs ?? [])
      .filter((log) => !deletedLogIds.has(log.id))
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-30);
    const notes = [...new Set([previous.note?.trim(), item.note?.trim()].filter((note): note is string => Boolean(note)))];
    byDate.set(item.date, {
      ...previous,
      ...item,
      nightWakeLogs: logs.length ? logs : undefined,
      note: notes.length ? notes.join("\n").slice(0, 1000) : undefined
    });
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function mergeCaregivers(current: AppState["caregivers"], incoming: AppState["caregivers"], deletedIds: Set<string>) {
  const result = current.filter((item) => !deletedIds.has(item.id));
  const incomingIdMap = new Map<string, string>();
  const usedIds = new Set(result.map((item) => item.id));
  const normalizedName = (name: string) => name.trim().toLocaleLowerCase("tr-TR");
  for (const caregiver of incoming.filter((item) => !deletedIds.has(item.id))) {
    const samePerson = result.find((item) => normalizedName(item.name) === normalizedName(caregiver.name));
    if (samePerson) {
      incomingIdMap.set(caregiver.id, samePerson.id);
      continue;
    }
    let id = caregiver.id;
    let suffix = 2;
    while (usedIds.has(id)) id = `${caregiver.id}-import-${suffix++}`;
    usedIds.add(id);
    result.push({ ...caregiver, id });
    incomingIdMap.set(caregiver.id, id);
  }
  return { caregivers: result, incomingIdMap };
}

function mergeSingleDataState(current: AppState, incoming: AppState): AppState {
  const sameBaby = current.baby.birthDate === incoming.baby.birthDate &&
    current.baby.gestationalWeek === incoming.baby.gestationalWeek &&
    current.baby.name.trim().toLocaleLowerCase("tr-TR") === incoming.baby.name.trim().toLocaleLowerCase("tr-TR");
  if (!sameBaby) throw new Error("Yedek farklı bir bebek profiline ait. Birleştirmek için aynı bebeğin adını, doğum tarihini ve gebelik haftasını kullanın; farklı profilde tam geri yüklemeyi seçin.");

  const syncTombstones = mergeSyncTombstones(current.syncTombstones, incoming.syncTombstones);
  const deletedEventIds = new Set(syncTombstones.eventIds);
  const deletedTaskIds = new Set(syncTombstones.careTaskIds);
  const deletedLogIds = new Set(syncTombstones.nightWakeLogIds);
  const deletedCaregiverIds = new Set(syncTombstones.caregiverIds);

  const events = mergeById(current.events, incoming.events, (previous, imported) => {
    const merged = { ...previous, ...imported };
    const endedAt = [previous.endedAt, imported.endedAt]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .at(-1);
    return { ...merged, endedAt };
  }).filter((event) => !deletedEventIds.has(event.id))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const caregiverMerge = mergeCaregivers(current.caregivers, incoming.caregivers, deletedCaregiverIds);
  const incomingTasks = incoming.careTasks.map((task) => task.assignedCaregiverId === undefined
    ? task
    : { ...task, assignedCaregiverId: caregiverMerge.incomingIdMap.get(task.assignedCaregiverId) });
  const mergedCareTasks = mergeById(current.careTasks, incomingTasks, (previous, imported) => {
    const merged = { ...previous, ...imported };
    const completedAt = [previous.completedAt, imported.completedAt]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .at(-1);
    return { ...merged, completedAt };
  }).filter((task) => !deletedTaskIds.has(task.id))
    .map((task) => deletedCaregiverIds.has(task.assignedCaregiverId ?? "") ? { ...task, assignedCaregiverId: undefined } : task)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const developmentCheckIns = new Map((current.developmentCheckIns ?? []).map((item) => [item.ageMonths, item]));
  for (const item of incoming.developmentCheckIns ?? []) {
    const previous = developmentCheckIns.get(item.ageMonths);
    developmentCheckIns.set(item.ageMonths, previous ? {
      ...previous,
      ...item,
      answers: { ...previous.answers, ...item.answers },
      note: [...new Set([previous.note?.trim(), item.note?.trim()].filter((note): note is string => Boolean(note)))].join("\n").slice(0, 500) || undefined
    } : item);
  }
  const instructions = [...new Set([current.careInstructions?.trim(), incoming.careInstructions?.trim()].filter((note): note is string => Boolean(note)))];

  return {
    ...current,
    baby: current.baby,
    caregiverName: current.caregiverName,
    careInstructions: instructions.join("\n").slice(0, 1000),
    syncTombstones,
    developmentCheckIns: [...developmentCheckIns.values()].sort((a, b) => b.ageMonths - a.ageMonths).slice(0, 12),
    caregivers: caregiverMerge.caregivers,
    activeCaregiverId: current.activeCaregiverId,
    events,
    careTasks: mergedCareTasks,
    sleepPlan: {
      ...current.sleepPlan,
      checkIns: mergeCheckIns(current.sleepPlan.checkIns, incoming.sleepPlan.checkIns, deletedLogIds),
      savedGuideIds: [...new Set([...(current.sleepPlan.savedGuideIds ?? []), ...(incoming.sleepPlan.savedGuideIds ?? [])])].slice(0, 100),
      completedDays: mergeById(current.sleepPlan.completedDays.map((item) => ({ ...item, id: `${item.date}-${item.day}` })), incoming.sleepPlan.completedDays.map((item) => ({ ...item, id: `${item.date}-${item.day}` })))
        .map(({ id: _id, ...item }) => item)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14),
      completedRuns: mergeById(current.sleepPlan.completedRuns, incoming.sleepPlan.completedRuns)
    }
  };
}

function childProfileFor(state: AppState): AppState["children"][number] {
  return { baby: state.baby, careInstructions: state.careInstructions, developmentCheckIns: state.developmentCheckIns, events: state.events, careTasks: state.careTasks, sleepPlan: state.sleepPlan };
}

function withChildProfile(state: AppState, child: AppState["children"][number]): AppState {
  return { ...state, ...child, activeChildId: child.baby.id, children: [] };
}

function filterChildWorkspace(child: AppState["children"][number], tombstones: SyncTombstones): AppState["children"][number] {
  const deletedEvents = new Set(tombstones.eventIds);
  const deletedTasks = new Set(tombstones.careTaskIds);
  const deletedLogs = new Set(tombstones.nightWakeLogIds);
  const deletedCaregivers = new Set(tombstones.caregiverIds);
  return {
    ...child,
    events: child.events.filter((event) => !deletedEvents.has(event.id)),
    careTasks: child.careTasks.filter((task) => !deletedTasks.has(task.id)).map((task) => deletedCaregivers.has(task.assignedCaregiverId ?? "") ? { ...task, assignedCaregiverId: undefined } : task),
    sleepPlan: {
      ...child.sleepPlan,
      checkIns: child.sleepPlan.checkIns.map((checkIn) => ({ ...checkIn, nightWakeLogs: checkIn.nightWakeLogs?.filter((log) => !deletedLogs.has(log.id)) }))
    }
  };
}

export function mergeDataStates(current: AppState, incoming: AppState): AppState {
  const syncTombstones = mergeSyncTombstones(current.syncTombstones, incoming.syncTombstones);
  const deletedChildIds = new Set(syncTombstones.childIds);
  const deletedCaregiverIds = new Set(syncTombstones.caregiverIds);
  const currentChildren = current.children.map((child) => child.baby.id === current.activeChildId ? childProfileFor(current) : child)
    .map((child) => filterChildWorkspace(child, syncTombstones))
    .filter((child) => !deletedChildIds.has(child.baby.id));
  if (!deletedChildIds.has(current.activeChildId) && !currentChildren.some((child) => child.baby.id === current.activeChildId)) currentChildren.push(filterChildWorkspace(childProfileFor(current), syncTombstones));
  const incomingChildren = incoming.children.map((child) => child.baby.id === incoming.activeChildId ? childProfileFor(incoming) : child)
    .map((child) => filterChildWorkspace(child, syncTombstones))
    .filter((child) => !deletedChildIds.has(child.baby.id));
  if (!deletedChildIds.has(incoming.activeChildId) && !incomingChildren.some((child) => child.baby.id === incoming.activeChildId)) incomingChildren.push(filterChildWorkspace(childProfileFor(incoming), syncTombstones));
  if (!currentChildren.length) throw new Error("Silme eşitlemesi son çocuk profilini kaldırmaya çalışıyor. Veriler korunarak birleştirme durduruldu.");

  for (const imported of incomingChildren) {
    const index = currentChildren.findIndex((child) => child.baby.id === imported.baby.id);
    if (index < 0) {
      currentChildren.push(imported);
      continue;
    }
    const merged = mergeSingleDataState(withChildProfile(current, currentChildren[index]!), withChildProfile(incoming, imported));
    currentChildren[index] = childProfileFor(merged);
  }

  const activeChildId = current.activeChildId || current.baby.id;
  const active = currentChildren.find((child) => child.baby.id === activeChildId) ?? currentChildren[0]!;
  const caregiverMerge = mergeCaregivers(current.caregivers, incoming.caregivers, deletedCaregiverIds);
  if (!caregiverMerge.caregivers.length) throw new Error("Silme eşitlemesi son bakım veren profilini kaldırmaya çalışıyor. Veriler korunarak birleştirme durduruldu.");
  const activeCaregiver = caregiverMerge.caregivers.find((caregiver) => caregiver.id === current.activeCaregiverId) ?? caregiverMerge.caregivers[0]!;
  return {
    ...current,
    ...active,
    syncTombstones,
    caregivers: caregiverMerge.caregivers,
    caregiverName: activeCaregiver.name,
    activeCaregiverId: activeCaregiver.id,
    preferences: current.preferences,
    children: currentChildren,
    activeChildId: active.baby.id
  };
}
