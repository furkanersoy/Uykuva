import { useCallback, useEffect, useMemo, useState } from "react";
import { Directory, File, Paths } from "expo-file-system";
import { AppPreferences, AppState, Baby, CareEvent, CareTask, Caregiver, DevelopmentAnswer, EventKind, SleepCheckIn, SleepFocus, SleepMethod } from "../domain/types";
import { createInitialState } from "../data/seed";
import { loadState, resetState, saveState } from "../data/storage";
import { cancelAllCareReminders } from "../services/notifications";
import { isSleepPlanPausedToday } from "../domain/sleep";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextRecurringDueAt(task: CareTask, now: Date) {
  const next = new Date(task.dueAt);
  const anchorDay = task.recurrenceDay ?? next.getDate();
  do {
    if (task.repeat === "weekly") next.setDate(next.getDate() + 7);
    else {
      const month = next.getMonth() + 1;
      next.setDate(1);
      next.setMonth(month);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(anchorDay, lastDay));
    }
  } while (next.getTime() <= now.getTime());
  return next.toISOString();
}

export function useUykuvaState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const retryStorage = useCallback(async () => {
    setStorageError(null);
    try {
      const saved = await loadState();
      setState(saved);
      setStorageReady(true);
    } catch {
      setStorageError("Kayıtlar yüklenemedi. Mevcut verileri korumak için boş durum kaydedilmedi.");
    }
  }, []);

  useEffect(() => {
    void retryStorage().finally(() => setHydrated(true));
  }, [retryStorage]);

  useEffect(() => {
    if (hydrated && storageReady) {
      void saveState(state).catch(() => setStorageError("Değişiklik cihazınıza kaydedilemedi."));
    }
  }, [hydrated, storageReady, state]);

  const completeOnboarding = useCallback((profile: { babyName: string; birthDate: string; gestationalWeek: number; caregiverName: string; growthChartSex?: "female" | "male" }) => {
    setState((current) => ({
      ...current,
      onboardingComplete: true,
      baby: {
        ...current.baby,
        name: profile.babyName.trim(),
        birthDate: profile.birthDate,
        gestationalWeek: profile.gestationalWeek,
        growthChartSex: profile.growthChartSex
      },
      caregiverName: profile.caregiverName.trim(),
      caregivers: [{ id: "caregiver-1", name: profile.caregiverName.trim(), role: "parent" }],
      activeCaregiverId: "caregiver-1",
      events: []
    }));
  }, []);

  const updateProfile = useCallback((baby: Baby, caregiverName: string) => {
    setState((current) => ({
      ...current,
      baby,
      caregiverName: caregiverName.trim(),
      caregivers: current.caregivers.map((item) => item.id === current.activeCaregiverId ? { ...item, name: caregiverName.trim() } : item)
    }));
  }, []);

  const updateCareInstructions = useCallback((careInstructions: string) => {
    setState((current) => ({ ...current, careInstructions: careInstructions.slice(0, 1000) }));
  }, []);

  const addCaregiver = useCallback((caregiver: Omit<Caregiver, "id">) => {
    setState((current) => ({ ...current, caregivers: [...current.caregivers, { ...caregiver, id: id("caregiver") }] }));
  }, []);

  const setActiveCaregiver = useCallback((caregiverId: string) => {
    setState((current) => {
      const selected = current.caregivers.find((item) => item.id === caregiverId);
      return selected ? { ...current, activeCaregiverId: selected.id, caregiverName: selected.name } : current;
    });
  }, []);

  const deleteCaregiver = useCallback((caregiverId: string) => {
    setState((current) => {
      if (current.caregivers.length <= 1) return current;
      const caregivers = current.caregivers.filter((item) => item.id !== caregiverId);
      const active = caregiverId === current.activeCaregiverId ? caregivers[0]! : caregivers.find((item) => item.id === current.activeCaregiverId)!;
      return { ...current, caregivers, activeCaregiverId: active.id, caregiverName: active.name };
    });
  }, []);

  const updatePreferences = useCallback((patch: Partial<AppPreferences>) => {
    setState((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));
  }, []);

  const addEvent = useCallback((event: Omit<CareEvent, "id" | "caregiver" | "startedAt"> & { startedAt?: string }) => {
    setState((current) => ({
      ...current,
      events: [
        {
          ...event,
          id: id(event.kind),
          caregiver: current.caregiverName,
          startedAt: event.startedAt ?? new Date().toISOString()
        },
        ...current.events
      ]
    }));
  }, []);

  const toggleSleep = useCallback(() => {
    setState((current) => {
      const running = current.events.find((event) => event.kind === "sleep" && !event.endedAt);
      if (running) {
        return {
          ...current,
          events: current.events.map((event) =>
            event.id === running.id ? { ...event, endedAt: new Date().toISOString() } : event
          )
        };
      }
      return {
        ...current,
        events: [
          { id: id("sleep"), kind: "sleep", startedAt: new Date().toISOString(), caregiver: current.caregiverName },
          ...current.events
        ]
      };
    });
  }, []);

  const toggleBreastfeed = useCallback((side: "left" | "right" | "both") => {
    setState((current) => {
      const running = current.events.find((event) => event.kind === "feed" && event.feedType === "breast" && !event.endedAt);
      const now = new Date().toISOString();
      if (running) {
        const sessions = running.breastSessions?.length
          ? running.breastSessions
          : [{ side: running.breastSide === "right" ? "right" as const : "left" as const, startedAt: running.startedAt }];
        const last = sessions[sessions.length - 1]!;
        if (side !== "both" && side === last.side) return current;
        const closedSessions = sessions.map((session, index) => index === sessions.length - 1 && !session.endedAt ? { ...session, endedAt: now } : session);
        if (side === "both") {
          return { ...current, events: current.events.map((event) => event.id === running.id ? { ...event, breastSessions: closedSessions, endedAt: now } : event) };
        }
        return {
          ...current,
          events: current.events.map((event) => event.id === running.id
            ? { ...event, breastSide: side, breastSessions: [...closedSessions, { side, startedAt: now }] }
            : event)
        };
      }
      return {
        ...current,
        events: [{ id: id("feed"), kind: "feed", feedType: "breast", breastSide: side, breastSessions: side === "both" ? [] : [{ side, startedAt: now }], startedAt: now, caregiver: current.caregiverName }, ...current.events]
      };
    });
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setState((current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId) }));
  }, []);

  const updateEvent = useCallback((eventId: string, patch: Partial<CareEvent>) => {
    setState((current) => ({ ...current, events: current.events.map((event) => event.id === eventId ? { ...event, ...patch, id: event.id, caregiver: event.caregiver } : event) }));
  }, []);

  const setMethod = useCallback((method: SleepMethod) => {
    setState((current) => current.sleepPlan.method === method
      ? current
      : { ...current, sleepPlan: { ...current.sleepPlan, method, completedToday: [] } });
  }, []);

  const setSleepFocus = useCallback((focus: SleepFocus) => {
    setState((current) => current.sleepPlan.focus === focus
      ? current
      : { ...current, sleepPlan: { ...current.sleepPlan, focus, completedToday: [] } });
  }, []);

  const toggleSleepPlanPaused = useCallback(() => {
    setState((current) => ({ ...current, sleepPlan: { ...current.sleepPlan, paused: !current.sleepPlan.paused } }));
  }, []);

  const toggleTask = useCallback((task: string) => {
    setState((current) => {
      const today = localDateKey();
      const plan = current.sleepPlan;
      if (isSleepPlanPausedToday(plan, today) || plan.completedDate || plan.lastAdvancedDate === today) return current;
      const completed = current.sleepPlan.completedToday.includes(task)
        ? current.sleepPlan.completedToday.filter((item) => item !== task)
        : [...current.sleepPlan.completedToday, task];
      return { ...current, sleepPlan: { ...plan, completedToday: completed } };
    });
  }, []);

  const toggleReadiness = useCallback((item: string) => {
    setState((current) => {
      const items = current.sleepPlan.readinessCompleted.includes(item)
        ? current.sleepPlan.readinessCompleted.filter((value) => value !== item)
        : [...current.sleepPlan.readinessCompleted, item];
      return { ...current, sleepPlan: { ...current.sleepPlan, readinessCompleted: items } };
    });
  }, []);

  const advancePlan = useCallback((completedTaskCount: number, totalTaskCount: number, appliedMethod?: SleepMethod) => {
    const today = localDateKey();
    setState((current) => {
      const plan = current.sleepPlan;
      if (isSleepPlanPausedToday(plan, today) || plan.completedDate || plan.lastAdvancedDate === today) return current;
      const dayRecord = {
        date: today,
        day: plan.day,
        method: appliedMethod ?? plan.method,
        focus: plan.focus,
        completedTasks: Math.max(0, Math.min(totalTaskCount, completedTaskCount)),
        totalTasks: Math.max(0, totalTaskCount)
      };
      const completedDays = [...plan.completedDays.filter((item) => item.date !== today), dayRecord].slice(-14);
      const runStartDate = plan.startDate.length === 10 ? plan.startDate : localDateKey(new Date(plan.startDate));
      const completedRuns = plan.day >= 14
        ? [...plan.completedRuns, { id: id("sleep-run"), startDate: runStartDate, completedDate: today, days: completedDays.filter((item) => item.date >= runStartDate) }].slice(-10)
        : plan.completedRuns;
      return {
        ...current,
        sleepPlan: plan.day >= 14
          ? { ...plan, completedDate: today, lastAdvancedDate: today, completedDays, completedRuns }
          : { ...plan, day: plan.day + 1, lastAdvancedDate: today, completedToday: [], completedDays }
      };
    });
  }, []);

  const restartSleepPlan = useCallback(() => {
    const today = localDateKey();
    setState((current) => current.sleepPlan.completedDate
      ? { ...current, sleepPlan: { ...current.sleepPlan, paused: false, startDate: today, day: 1, completedToday: [], completedDays: [], lastAdvancedDate: undefined, completedDate: undefined } }
      : current);
  }, []);

  const saveCheckIn = useCallback((checkIn: SleepCheckIn) => {
    setState((current) => ({
      ...current,
      sleepPlan: {
        ...current.sleepPlan,
        checkIns: [checkIn, ...current.sleepPlan.checkIns.filter((item) => item.date !== checkIn.date)]
      }
    }));
  }, []);

  const saveDevelopmentAnswer = useCallback((ageMonths: 2 | 4 | 6 | 9 | 12 | 15 | 18 | 24 | 30 | 36 | 48 | 60, milestoneId: string, answer: DevelopmentAnswer) => {
    setState((current) => {
      const records = current.developmentCheckIns ?? [];
      const previous = records.find((item) => item.ageMonths === ageMonths);
      const next = {
        ageMonths,
        checkedAt: new Date().toISOString(),
        answers: { ...(previous?.answers ?? {}), [milestoneId]: answer },
        note: previous?.note
      };
      return { ...current, developmentCheckIns: [next, ...records.filter((item) => item.ageMonths !== ageMonths)].slice(0, 12) };
    });
  }, []);

  const saveDevelopmentNote = useCallback((ageMonths: 2 | 4 | 6 | 9 | 12 | 15 | 18 | 24 | 30 | 36 | 48 | 60, note: string) => {
    setState((current) => {
      const records = current.developmentCheckIns ?? [];
      const previous = records.find((item) => item.ageMonths === ageMonths);
      const next = {
        ageMonths,
        checkedAt: new Date().toISOString(),
        answers: previous?.answers ?? {},
        note: note.slice(0, 500)
      };
      return { ...current, developmentCheckIns: [next, ...records.filter((item) => item.ageMonths !== ageMonths)].slice(0, 12) };
    });
  }, []);

  const updateSleepSchedule = useCallback((bedtime: string, wakeTime: string) => {
    setState((current) => ({ ...current, sleepPlan: { ...current.sleepPlan, bedtime, wakeTime } }));
  }, []);

  const toggleRoutineStep = useCallback((stepId: string) => {
    setState((current) => ({
      ...current,
      sleepPlan: { ...current.sleepPlan, routine: current.sleepPlan.routine.map((step) => step.id === stepId ? { ...step, enabled: !step.enabled } : step) }
    }));
  }, []);

  const moveRoutineStep = useCallback((stepId: string, direction: -1 | 1) => {
    setState((current) => {
      const routine = [...current.sleepPlan.routine];
      const index = routine.findIndex((step) => step.id === stepId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= routine.length) return current;
      [routine[index], routine[destination]] = [routine[destination]!, routine[index]!];
      return { ...current, sleepPlan: { ...current.sleepPlan, routine } };
    });
  }, []);

  const addRoutineStep = useCallback((label: string, minutes: number) => {
    setState((current) => ({
      ...current,
      sleepPlan: { ...current.sleepPlan, routine: [...current.sleepPlan.routine, { id: id("routine"), label: label.trim(), minutes, enabled: true }] }
    }));
  }, []);

  const deleteRoutineStep = useCallback((stepId: string) => {
    setState((current) => ({ ...current, sleepPlan: { ...current.sleepPlan, routine: current.sleepPlan.routine.filter((step) => step.id !== stepId) } }));
  }, []);

  const addCareTask = useCallback((task: Omit<CareTask, "id">) => {
    setState((current) => {
      const recurring = task.type === "appointment" && task.repeat;
      const dueAt = new Date(task.dueAt);
      return { ...current, careTasks: [...current.careTasks, { ...task, repeat: recurring ? task.repeat : undefined, recurrenceId: recurring ? task.recurrenceId ?? id("recurrence") : undefined, recurrenceDay: recurring ? task.recurrenceDay ?? dueAt.getDate() : undefined, id: id(task.type) }] };
    });
  }, []);

  const updateCareTask = useCallback((taskId: string, patch: Partial<Omit<CareTask, "id">>) => {
    setState((current) => ({
      ...current,
      careTasks: current.careTasks.map((task) => task.id === taskId ? { ...task, ...patch, repeat: patch.type === "vaccine" || patch.repeat === undefined ? undefined : patch.repeat, recurrenceId: patch.type === "vaccine" || patch.repeat === undefined ? undefined : task.recurrenceId ?? id("recurrence"), recurrenceDay: patch.type === "vaccine" || patch.repeat === undefined ? undefined : task.recurrenceDay ?? new Date(patch.dueAt ?? task.dueAt).getDate(), id: task.id } : task)
    }));
  }, []);

  const toggleCareTask = useCallback((taskId: string) => {
    setState((current) => {
      const task = current.careTasks.find((item) => item.id === taskId);
      if (!task) return current;
      if (task.completedAt) return {
        ...current,
        careTasks: current.careTasks.filter((item) => !(task.recurrenceId && item.generated && !item.completedAt && item.recurrenceId === task.recurrenceId)).map((item) => item.id === taskId ? { ...item, completedAt: undefined } : item)
      };
      const completedAt = new Date();
      const following = task.type === "appointment" && task.repeat && task.recurrenceId
        ? { ...task, id: id("appointment"), dueAt: nextRecurringDueAt(task, completedAt), completedAt: undefined, generated: true }
        : undefined;
      const exists = following && current.careTasks.some((item) => item.recurrenceId === task.recurrenceId && !item.completedAt && new Date(item.dueAt).getTime() > completedAt.getTime());
      const careTasks = current.careTasks.filter((item) => !(following && item.id !== taskId && item.generated && !item.completedAt && item.recurrenceId === task.recurrenceId && new Date(item.dueAt).getTime() <= completedAt.getTime()));
      return { ...current, careTasks: [...careTasks.map((item) => item.id === taskId ? { ...item, completedAt: completedAt.toISOString() } : item), ...(following && !exists ? [following] : [])] };
    });
  }, []);

  const deleteCareTask = useCallback((taskId: string) => {
    setState((current) => ({ ...current, careTasks: current.careTasks.filter((task) => task.id !== taskId) }));
  }, []);

  const restoreData = useCallback((restored: AppState) => {
    setState(restored);
  }, []);

  const clearAllData = useCallback(async () => {
    const [remindersCancelled, backupsDeleted] = await Promise.all([
      cancelAllCareReminders().then(() => true).catch(() => false),
      Promise.resolve().then(() => {
        const cache = new Directory(Paths.cache);
        const backups = cache.list().filter((entry): entry is File => entry instanceof File && /^uykuva-yedek-\d{4}-\d{2}-\d{2}\.json$/.test(entry.name));
        backups.forEach((file) => file.delete());
        return true;
      }).catch(() => false)
    ]);
    await resetState();
    setState(createInitialState());
    setStorageReady(true);
    setStorageError(null);
    return { remindersCancelled, backupsDeleted };
  }, []);

  const runningSleep = useMemo(
    () => state.events.find((event) => event.kind === "sleep" && !event.endedAt),
    [state.events]
  );
  const runningFeed = useMemo(
    () => state.events.find((event) => event.kind === "feed" && event.feedType === "breast" && !event.endedAt),
    [state.events]
  );

  const addSimpleEvent = useCallback((kind: Exclude<EventKind, "sleep">, details: Partial<CareEvent> = {}) => {
    addEvent({ kind, ...details });
  }, [addEvent]);

  return {
    state,
    hydrated,
    storageReady,
    storageError,
    retryStorage,
    runningSleep,
    runningFeed,
    completeOnboarding,
    updateProfile,
    updateCareInstructions,
    addCaregiver,
    setActiveCaregiver,
    deleteCaregiver,
    updatePreferences,
    addEvent,
    addSimpleEvent,
    toggleSleep,
    toggleBreastfeed,
    deleteEvent,
    updateEvent,
    setMethod,
    setSleepFocus,
    toggleSleepPlanPaused,
    toggleTask,
    toggleReadiness,
    advancePlan,
    restartSleepPlan,
    saveCheckIn,
    saveDevelopmentAnswer,
    saveDevelopmentNote,
    updateSleepSchedule,
    toggleRoutineStep,
    moveRoutineStep,
    addRoutineStep,
    deleteRoutineStep,
    addCareTask,
    updateCareTask,
    toggleCareTask,
    deleteCareTask,
    restoreData,
    clearAllData
  };
}
